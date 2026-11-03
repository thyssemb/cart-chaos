#!/usr/bin/env python3
"""Build a small web GLB from the Sketchfab food pack.

The source file is a SketchUp dump: hundreds of thousands of triangles, unnamed
nodes, and KHR_materials_pbrSpecularGlossiness. The game only needs four
products. This keeps their meshes and textures, drops the rest, converts the
materials to metallic-roughness, and bakes the pack's Z-up correction plus a
uniform scale so each product is centered and about a grocery-item tall.

Source: apps/client/public/assets/models/food_pack.glb
Output: apps/client/public/assets/models/food_products.glb
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "apps/client/public/assets/models/food_pack.glb"
DST = ROOT / "apps/client/public/assets/models/food_products.glb"

# Node indices in the source. The longest edge becomes `size` metres.
PRODUCTS = (
    ("milk", (6, 7, 8), 0.26),
    ("cheese", (13, 14, 15), 0.16),
    ("cereal", (19, 20, 21, 22), 0.26),
    ("drink", (92, 93, 94), 0.26),
)

COMPONENTS = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
VEC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}


def load_glb(path: Path) -> tuple[dict, bytes]:
    data = path.read_bytes()
    magic, _version, length = struct.unpack_from("<III", data, 0)
    if magic != 0x46546C67:
        raise SystemExit(f"{path} n'est pas un GLB")
    offset = 12
    chunks: list[tuple[int, bytes]] = []
    while offset < length:
        size, kind = struct.unpack_from("<II", data, offset)
        chunks.append((kind, data[offset + 8 : offset + 8 + size]))
        offset += 8 + size
    return json.loads(chunks[0][1]), chunks[1][1]


def read_accessor(doc: dict, blob: bytes, index: int) -> list[tuple[float, ...]]:
    accessor = doc["accessors"][index]
    view = doc["bufferViews"][accessor["bufferView"]]
    fmt, width = COMPONENTS[accessor["componentType"]]
    count_components = VEC[accessor["type"]]
    stride = view.get("byteStride", width * count_components)
    start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
    values: list[tuple[float, ...]] = []
    for i in range(accessor["count"]):
        values.append(struct.unpack_from("<" + fmt * count_components, blob, start + i * stride))
    return values


def yup(x: float, y: float, z: float) -> tuple[float, float, float]:
    """Sketchfab root turns SketchUp Z-up into glTF Y-up: (x, y, z) -> (x, z, -y)."""
    return (x, z, -y)


def normalize(v: tuple[float, float, float]) -> tuple[float, float, float]:
    length = math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) or 1.0
    return (v[0] / length, v[1] / length, v[2] / length)


def bounds(points: list[tuple[float, float, float]]) -> tuple[tuple[float, float, float], tuple[float, float, float]]:
    mins = [min(p[i] for p in points) for i in range(3)]
    maxs = [max(p[i] for p in points) for i in range(3)]
    return (mins[0], mins[1], mins[2]), (maxs[0], maxs[1], maxs[2])


def pack_f32(values: list[tuple[float, ...]]) -> bytes:
    out = bytearray()
    for row in values:
        out += struct.pack("<" + "f" * len(row), *row)
    return bytes(out)


def pack_u32(values: list[int]) -> bytes:
    return struct.pack("<" + "I" * len(values), *values)


def main() -> None:
    doc, blob = load_glb(SRC)
    materials = doc["materials"]
    images = doc["images"]
    textures = doc["textures"]

    buffer = bytearray()
    views: list[dict] = []
    accessors: list[dict] = []
    new_materials: list[dict] = []
    new_textures: list[dict] = []
    new_images: list[dict] = []
    meshes: list[dict] = []
    nodes: list[dict] = []
    material_map: dict[int, int] = {}
    texture_map: dict[int, int] = {}
    image_map: dict[int, int] = {}
    product_nodes: list[int] = []
    report: list[str] = []

    def push_view(data: bytes, target: int | None) -> int:
        while len(buffer) % 4:
            buffer.append(0)
        view = {"buffer": 0, "byteOffset": len(buffer), "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        views.append(view)
        buffer.extend(data)
        return len(views) - 1

    def push_image(source_texture: int) -> int:
        if source_texture in texture_map:
            return texture_map[source_texture]
        texture = textures[source_texture]
        source = texture["source"]
        if source not in image_map:
            image = images[source]
            view = doc["bufferViews"][image["bufferView"]]
            start = view.get("byteOffset", 0)
            raw = blob[start : start + view["byteLength"]]
            image_map[source] = len(new_images)
            new_images.append({"bufferView": push_view(raw, None), "mimeType": image["mimeType"]})
        new_textures.append({"sampler": 0, "source": image_map[source]})
        texture_map[source_texture] = len(new_textures) - 1
        return texture_map[source_texture]

    def push_material(source_index: int) -> int:
        if source_index in material_map:
            return material_map[source_index]
        source = materials[source_index]
        spec = source.get("extensions", {}).get("KHR_materials_pbrSpecularGlossiness", {})
        pbr: dict = {
            "baseColorFactor": spec.get("diffuseFactor", [1, 1, 1, 1]),
            "metallicFactor": 0,
            "roughnessFactor": round(1 - float(spec.get("glossinessFactor", 0.4)), 4),
        }
        if "diffuseTexture" in spec:
            pbr["baseColorTexture"] = {"index": push_image(spec["diffuseTexture"]["index"])}
        material_map[source_index] = len(new_materials)
        new_materials.append({"name": source.get("name", f"mat-{source_index}"), "doubleSided": True, "pbrMetallicRoughness": pbr})
        return material_map[source_index]

    for name, node_ids, size in PRODUCTS:
        child_nodes: list[int] = []
        world_points: list[tuple[float, float, float]] = []
        prepared: list[tuple[int, list[tuple[float, float, float]], list[tuple[float, float, float]], list[tuple[float, ...]] | None, list[int]]] = []
        triangles = 0
        for node_id in node_ids:
            primitive = doc["meshes"][doc["nodes"][node_id]["mesh"]]["primitives"][0]
            if primitive.get("mode", 4) != 4:
                raise SystemExit(f"primitive non triangulée sur le nœud {node_id}")
            positions = [yup(*p) for p in read_accessor(doc, blob, primitive["attributes"]["POSITION"])]
            normals = [normalize(yup(*n)) for n in read_accessor(doc, blob, primitive["attributes"]["NORMAL"])]
            uv_index = primitive["attributes"].get("TEXCOORD_0")
            uvs = read_accessor(doc, blob, uv_index) if uv_index is not None else None
            raw_indices = read_accessor(doc, blob, primitive["indices"])
            indices = [int(item[0]) for item in raw_indices]
            triangles += len(indices) // 3
            world_points.extend(positions)
            prepared.append((primitive["material"], positions, normals, uvs, indices))

        (min_x, min_y, min_z), (max_x, max_y, max_z) = bounds(world_points)
        center = ((min_x + max_x) / 2, (min_y + max_y) / 2, (min_z + max_z) / 2)
        extent = max(max_x - min_x, max_y - min_y, max_z - min_z)
        if extent <= 0:
            raise SystemExit(f"{name} a une taille nulle")
        scale = size / extent

        for material, positions, normals, uvs, indices in prepared:
            placed = [((p[0] - center[0]) * scale, (p[1] - center[1]) * scale, (p[2] - center[2]) * scale) for p in positions]
            pos_min, pos_max = bounds(placed)
            pos_view = push_view(pack_f32(placed), 34962)
            normal_view = push_view(pack_f32(normals), 34962)
            index_view = push_view(pack_u32(indices), 34963)
            accessors.append({"bufferView": pos_view, "componentType": 5126, "count": len(placed), "type": "VEC3", "min": list(pos_min), "max": list(pos_max)})
            accessors.append({"bufferView": normal_view, "componentType": 5126, "count": len(normals), "type": "VEC3"})
            attributes = {"POSITION": len(accessors) - 2, "NORMAL": len(accessors) - 1}
            if uvs is not None:
                uv_view = push_view(pack_f32(uvs), 34962)
                accessors.append({"bufferView": uv_view, "componentType": 5126, "count": len(uvs), "type": "VEC2"})
                attributes["TEXCOORD_0"] = len(accessors) - 1
            accessors.append({"bufferView": index_view, "componentType": 5125, "count": len(indices), "type": "SCALAR"})
            meshes.append(
                {
                    "name": f"{name}_{materials[material].get('name', material)}",
                    "primitives": [
                        {
                            "attributes": attributes,
                            "indices": len(accessors) - 1,
                            "material": push_material(material),
                            "mode": 4,
                        }
                    ],
                }
            )
            nodes.append({"name": meshes[-1]["name"], "mesh": len(meshes) - 1})
            child_nodes.append(len(nodes) - 1)

        nodes.append({"name": name, "children": child_nodes})
        product_nodes.append(len(nodes) - 1)
        final_min, final_max = bounds(
            [((p[0] - center[0]) * scale, (p[1] - center[1]) * scale, (p[2] - center[2]) * scale) for p in world_points]
        )
        dims = tuple(round(final_max[i] - final_min[i], 3) for i in range(3))
        report.append(f"{name}: {triangles} tris, {dims[0]} × {dims[1]} × {dims[2]} m")

    gltf = {
        "asset": {
            "version": "2.0",
            "generator": "cart-chaos trim-food-pack.py",
            "extras": {
                "title": "Food pack",
                "author": "Pasha (https://sketchfab.com/Pasha-)",
                "license": "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)",
                "source": "https://sketchfab.com/3d-models/food-pack-195c0c0d23e14e4693c640b16734714c",
            },
        },
        "scene": 0,
        "scenes": [{"name": "food", "nodes": product_nodes}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": new_materials,
        "textures": new_textures,
        "images": new_images,
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(buffer)}],
    }

    json_chunk = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    json_chunk += b" " * ((4 - len(json_chunk) % 4) % 4)
    bin_chunk = bytes(buffer)
    bin_chunk += b"\x00" * ((4 - len(bin_chunk) % 4) % 4)
    total = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    glb = bytearray()
    glb += struct.pack("<III", 0x46546C67, 2, total)
    glb += struct.pack("<II", len(json_chunk), 0x4E4F534A)
    glb += json_chunk
    glb += struct.pack("<II", len(bin_chunk), 0x004E4942)
    glb += bin_chunk
    DST.parent.mkdir(parents=True, exist_ok=True)
    DST.write_bytes(glb)
    print(f"wrote {DST.relative_to(ROOT)} ({len(glb)} bytes, was {SRC.stat().st_size})")
    print("\n".join(report))
    if len(glb) > 8_000_000:
        raise SystemExit("le GLB allégé dépasse 8 Mo")


if __name__ == "__main__":
    main()
