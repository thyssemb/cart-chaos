#!/usr/bin/env python3
"""Build the runtime shopping-cart GLB.

The Sketchfab export is a glTF + bin with empty wrapper nodes, scales of 0.01
and 100, and KHR_materials_pbrSpecularGlossiness colors. There are no cameras,
lights, or image textures. This bakes the mesh, converts the solid colors to
metallic-roughness, drops unused UVs, and fits the basket to the gameplay cart:
about 1.02 m wide, wheels on the ground, handle toward the player (-Z).

Source: tools/sources/cartoon-shopping-cart/
Output: apps/client/public/assets/models/shopping_cart.glb
"""

from __future__ import annotations

import json
import math
import struct
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "tools/sources/cartoon-shopping-cart/scene.gltf"
BIN = ROOT / "tools/sources/cartoon-shopping-cart/scene.bin"
DST = ROOT / "apps/client/public/assets/models/shopping_cart.glb"

TARGET_WIDTH = 1.02
HANDLE_Z = -0.62
SLOT_MARGIN = 0.06
SLOTS = tuple((x, -0.18 if row else 0.16) for row in (0, 1) for x in (-0.36, -0.12, 0.12, 0.36))

COMPONENTS = {5120: ("b", 1), 5121: ("B", 1), 5122: ("h", 2), 5123: ("H", 2), 5125: ("I", 4), 5126: ("f", 4)}
VEC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}

HANDLE_NODE = 4
WHEEL_NODES = (6, 7, 8)
BASKET_NODE = 10


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


def mat_from(values: list[float]) -> list[list[float]]:
    return [[values[c * 4 + r] for c in range(4)] for r in range(4)]


def ident() -> list[list[float]]:
    return [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]


def mul(a: list[list[float]], b: list[list[float]]) -> list[list[float]]:
    return [[sum(a[r][k] * b[k][c] for k in range(4)) for c in range(4)] for r in range(4)]


def apply(m: list[list[float]], x: float, y: float, z: float) -> tuple[float, float, float]:
    return (
        m[0][0] * x + m[0][1] * y + m[0][2] * z + m[0][3],
        m[1][0] * x + m[1][1] * y + m[1][2] * z + m[1][3],
        m[2][0] * x + m[2][1] * y + m[2][2] * z + m[2][3],
    )


def world_matrices(doc: dict) -> list[list[list[float]]]:
    nodes = doc["nodes"]
    world: list[list[list[float]] | None] = [None] * len(nodes)

    def visit(index: int, parent: list[list[float]]) -> None:
        local = mat_from(nodes[index]["matrix"]) if "matrix" in nodes[index] else ident()
        current = mul(parent, local)
        world[index] = current
        for child in nodes[index].get("children") or []:
            visit(child, current)

    for index in doc["scenes"][doc["scene"]]["nodes"]:
        visit(index, ident())
    if any(item is None for item in world):
        raise SystemExit("nœud hors de la scène")
    return world  # type: ignore[return-value]


def orient(point: tuple[float, float, float]) -> tuple[float, float, float]:
    """Yaw -90°: the handle, authored toward +X, points toward the player (-Z)."""
    x, y, z = point
    return (-z, y, -x)


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


def mesh_data(doc: dict, blob: bytes, world: list[list[list[float]]], node_id: int) -> tuple[int, list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]:
    node = doc["nodes"][node_id]
    primitive = doc["meshes"][node["mesh"]]["primitives"][0]
    if primitive.get("mode", 4) != 4:
        raise SystemExit(f"primitive non triangulée sur {node['name']}")
    matrix = world[node_id]
    positions = [orient(apply(matrix, *p)) for p in read_accessor(doc, blob, primitive["attributes"]["POSITION"])]
    normals = []
    for n in read_accessor(doc, blob, primitive["attributes"]["NORMAL"]):
        rotated = (
            matrix[0][0] * n[0] + matrix[0][1] * n[1] + matrix[0][2] * n[2],
            matrix[1][0] * n[0] + matrix[1][1] * n[1] + matrix[1][2] * n[2],
            matrix[2][0] * n[0] + matrix[2][1] * n[1] + matrix[2][2] * n[2],
        )
        ox, oy, oz = orient(rotated)
        length = math.sqrt(ox * ox + oy * oy + oz * oz) or 1.0
        normals.append((ox / length, oy / length, oz / length))
    indices = [int(item[0]) for item in read_accessor(doc, blob, primitive["indices"])]
    return primitive["material"], positions, normals, indices


def main() -> None:
    doc = json.loads(SRC.read_text())
    blob = BIN.read_bytes()
    world = world_matrices(doc)
    materials = doc["materials"]

    parts = {name: mesh_data(doc, blob, world, node) for name, node in (("handle", HANDLE_NODE), ("basket", BASKET_NODE))}
    wheels = [mesh_data(doc, blob, world, node) for node in WHEEL_NODES]
    all_points = [p for _, positions, _, _ in (*parts.values(), *wheels) for p in positions]
    (min_x, min_y, min_z), (max_x, _, _) = bounds(all_points)
    width = max_x - min_x
    if width <= 0:
        raise SystemExit("largeur nulle")
    scale = TARGET_WIDTH / width

    def fit(point: tuple[float, float, float], dz: float) -> tuple[float, float, float]:
        return (point[0] * scale, point[1] * scale - min_y * scale, point[2] * scale + dz)

    basket_points = parts["basket"][1]
    (bmin_x, _, bmin_z), (bmax_x, _, _) = bounds(basket_points)
    handle_points = parts["handle"][1]
    handle_back = min(p[2] for p in handle_points)
    # Keep CART_SLOTS inside the basket, then pull the grip back toward the pusher.
    max_dz = -0.18 - SLOT_MARGIN - bmin_z * scale
    wanted_dz = HANDLE_Z - handle_back * scale
    dz = min(wanted_dz, max_dz)

    fitted_basket = [fit(p, dz) for p in basket_points]
    (bx0, by0, bz0), (bx1, by1, bz1) = bounds(fitted_basket)
    for x, z in SLOTS:
        if not (bx0 + 0.02 <= x <= bx1 - 0.02 and bz0 + 0.02 <= z <= bz1 - 0.02):
            raise SystemExit(f"emplacement {x},{z} hors du panier {(bx0, bz0)} {(bx1, bz1)}")
    if by0 > 0.7 or by1 < 0.7:
        raise SystemExit(f"le panier ne couvre pas la hauteur des articles: {by0}..{by1}")

    clusters: list[tuple[float, float, float]] = []
    wheel_points = wheels[0][1]
    cx = sum(p[0] for p in wheel_points) / len(wheel_points)
    cz = sum(p[2] for p in wheel_points) / len(wheel_points)
    groups: dict[tuple[int, int], list[tuple[float, float, float]]] = {}
    for point in wheel_points:
        groups.setdefault((1 if point[0] >= cx else 0, 1 if point[2] >= cz else 0), []).append(point)
    if len(groups) != 4:
        raise SystemExit(f"{len(groups)} roues au lieu de 4")
    for points in groups.values():
        clusters.append(
            (
                sum(p[0] for p in points) / len(points),
                sum(p[1] for p in points) / len(points),
                sum(p[2] for p in points) / len(points),
            )
        )

    def nearest(point: tuple[float, float, float]) -> int:
        best = 0
        best_d = float("inf")
        for index, center in enumerate(clusters):
            d = (point[0] - center[0]) ** 2 + (point[2] - center[2]) ** 2
            if d < best_d:
                best = index
                best_d = d
        return best

    buffer = bytearray()
    views: list[dict] = []
    accessors: list[dict] = []
    meshes: list[dict] = []
    nodes: list[dict] = []
    new_materials: list[dict] = []
    material_map: dict[int, int] = {}

    def push_view(data: bytes, target: int | None) -> int:
        while len(buffer) % 4:
            buffer.append(0)
        view = {"buffer": 0, "byteOffset": len(buffer), "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        views.append(view)
        buffer.extend(data)
        return len(views) - 1

    def push_material(source_index: int) -> int:
        if source_index in material_map:
            return material_map[source_index]
        source = materials[source_index]
        spec = source.get("extensions", {}).get("KHR_materials_pbrSpecularGlossiness", {})
        material_map[source_index] = len(new_materials)
        new_materials.append(
            {
                "name": source.get("name", f"mat-{source_index}"),
                "doubleSided": True,
                "pbrMetallicRoughness": {
                    "baseColorFactor": spec.get("diffuseFactor", [1, 1, 1, 1]),
                    "metallicFactor": 0,
                    "roughnessFactor": round(1 - float(spec.get("glossinessFactor", 0.4)), 4),
                },
            }
        )
        return material_map[source_index]

    def add_mesh(name: str, material: int, positions: list[tuple[float, float, float]], normals: list[tuple[float, float, float]], indices: list[int]) -> int:
        pos_min, pos_max = bounds(positions)
        pos_view = push_view(pack_f32(positions), 34962)
        normal_view = push_view(pack_f32(normals), 34962)
        index_view = push_view(pack_u32(indices), 34963)
        accessors.append({"bufferView": pos_view, "componentType": 5126, "count": len(positions), "type": "VEC3", "min": list(pos_min), "max": list(pos_max)})
        accessors.append({"bufferView": normal_view, "componentType": 5126, "count": len(normals), "type": "VEC3"})
        accessors.append({"bufferView": index_view, "componentType": 5125, "count": len(indices), "type": "SCALAR"})
        meshes.append(
            {
                "name": name,
                "primitives": [{"attributes": {"POSITION": len(accessors) - 3, "NORMAL": len(accessors) - 2}, "indices": len(accessors) - 1, "material": push_material(material), "mode": 4}],
            }
        )
        nodes.append({"name": name, "mesh": len(meshes) - 1})
        return len(nodes) - 1

    body_nodes: list[int] = []
    report: list[str] = []
    for name, (material, positions, normals, indices) in parts.items():
        placed = [fit(p, dz) for p in positions]
        body_nodes.append(add_mesh(name, material, placed, normals, indices))
        (p0, q0, r0), (p1, q1, r1) = bounds(placed)
        report.append(f"{name}: {len(indices)//3} tris, {p1-p0:.3f} × {q1-q0:.3f} × {r1-r0:.3f} m")

    wheel_roots: list[int] = []
    static_wheel_tris = 0
    for wheel_index, center in enumerate(clusters):
        local_center = fit(center, dz)
        child_nodes: list[int] = []
        for material, positions, normals, indices in wheels:
            kept_pos: list[tuple[float, float, float]] = []
            kept_nrm: list[tuple[float, float, float]] = []
            remap = [-1] * len(positions)
            kept_idx: list[int] = []
            for corner in range(0, len(indices), 3):
                tri = indices[corner : corner + 3]
                if {nearest(positions[vertex]) for vertex in tri} != {wheel_index}:
                    continue
                for vertex in tri:
                    if remap[vertex] < 0:
                        remap[vertex] = len(kept_pos)
                        world_point = fit(positions[vertex], dz)
                        kept_pos.append(tuple(world_point[axis] - local_center[axis] for axis in range(3)))
                        kept_nrm.append(normals[vertex])
                    kept_idx.append(remap[vertex])
            if not kept_idx:
                continue
            child_nodes.append(add_mesh(f"wheel-{wheel_index}-{materials[material].get('name', material)}", material, kept_pos, kept_nrm, kept_idx))
        if not child_nodes:
            raise SystemExit(f"roue {wheel_index} vide")
        nodes.append({"name": "wheel", "translation": list(local_center), "children": child_nodes})
        wheel_roots.append(len(nodes) - 1)
    for material, positions, normals, indices in wheels:
        kept_pos = []
        kept_nrm = []
        remap = [-1] * len(positions)
        kept_idx = []
        for corner in range(0, len(indices), 3):
            tri = indices[corner : corner + 3]
            if len({nearest(positions[vertex]) for vertex in tri}) < 2:
                continue
            static_wheel_tris += 1
            for vertex in tri:
                if remap[vertex] < 0:
                    remap[vertex] = len(kept_pos)
                    kept_pos.append(fit(positions[vertex], dz))
                    kept_nrm.append(normals[vertex])
                kept_idx.append(remap[vertex])
        if kept_idx:
            body_nodes.append(add_mesh(f"axle-{materials[material].get('name', material)}", material, kept_pos, kept_nrm, kept_idx))
    report.append(f"triangles d'essieu fixes: {static_wheel_tris}")
    nodes.append({"name": "wheels", "children": wheel_roots})
    wheels_node = len(nodes) - 1
    nodes.append({"name": "cart", "children": [*body_nodes, wheels_node]})

    fitted_all = [fit(p, dz) for p in all_points]
    (ax0, ay0, az0), (ax1, ay1, az1) = bounds(fitted_all)
    report.insert(0, f"caddie: {ax1-ax0:.3f} × {ay1-ay0:.3f} × {az1-az0:.3f} m, poignée z {min(fit(p, dz)[2] for p in handle_points):.3f}, échelle {scale:.4f}")
    report.append(f"panier x {bx0:.3f}..{bx1:.3f} y {by0:.3f}..{by1:.3f} z {bz0:.3f}..{bz1:.3f}")

    gltf = {
        "asset": {
            "version": "2.0",
            "generator": "cart-chaos trim-shopping-cart.py",
            "extras": {
                "title": "Cartoon Shopping Cart",
                "author": "İlhan Fehimovski (https://sketchfab.com/ilhanfehimovski)",
                "license": "CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)",
                "source": "https://sketchfab.com/3d-models/cartoon-shopping-cart-f9d4c719cb474a8f938d13116e498c94",
            },
        },
        "scene": 0,
        "scenes": [{"name": "cart", "nodes": [len(nodes) - 1]}],
        "nodes": nodes,
        "meshes": meshes,
        "materials": new_materials,
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
    print(f"wrote {DST.relative_to(ROOT)} ({len(glb)} bytes)")
    print("\n".join(report))


if __name__ == "__main__":
    main()
