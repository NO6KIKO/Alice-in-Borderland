"""Game-ready LOD for a Tripo prop: decimate to a triangle budget, shrink textures, keep PBR maps.

  blender -b -P blender/prop_lod.py -- <in.glb> <out.glb> [target_tris=4000] [tex_px=1024]
"""
import bpy, sys, os

a = sys.argv[sys.argv.index('--') + 1:]
src, out = a[0], a[1]
target = int(a[2]) if len(a) > 2 else 4000
tex = int(a[3]) if len(a) > 3 else 1024

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
total = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
ratio = min(1.0, target / max(total, 1))
for o in meshes:
    m = o.modifiers.new('dec', 'DECIMATE'); m.ratio = ratio; m.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=m.name)
for img in bpy.data.images:
    if img.size[0] > tex:
        img.scale(tex, int(tex * img.size[1] / img.size[0]))
after = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in meshes)
bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', export_image_format='JPEG', export_jpeg_quality=85)
print(f'LOD {os.path.basename(src)}: {total} -> {after} tris, {os.path.getsize(out) / 1e6:.2f} MB')
