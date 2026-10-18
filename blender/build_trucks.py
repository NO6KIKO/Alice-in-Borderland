"""Procedural detailed trucks for the night-compound scene.

Run:  blender -b -P blender/build_trucks.py -- <out_dir>
Exports truck_semi.glb (cab-over tractor + 13.6m box trailer) and truck_box.glb (rigid box truck).
Model convention: front faces +X, ground at Z=0, origin at the front-axle centre line.
"""
import bpy, bmesh, sys, math, os
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.dirname(__file__)

# ───────── scene reset ─────────
bpy.ops.wm.read_factory_settings(use_empty=True)

# ───────── materials ─────────
MATS = {}
def mat(name, color, metal=0.0, rough=0.5, emit=None, strength=0.0, alpha=1.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metal
    p.inputs['Roughness'].default_value = rough
    if coat:
        p.inputs['Coat Weight'].default_value = coat
    if emit:
        p.inputs['Emission Color'].default_value = (*emit, 1)
        p.inputs['Emission Strength'].default_value = strength
    if alpha < 1:
        p.inputs['Alpha'].default_value = alpha
    MATS[name] = m
    return m

mat('paint_white', (0.82, 0.84, 0.85), 0.1, 0.32, coat=0.6)
mat('paint_blue', (0.03, 0.12, 0.32), 0.3, 0.28, coat=0.8)
mat('paint_red', (0.45, 0.04, 0.03), 0.3, 0.3, coat=0.8)
mat('stripe_blue', (0.02, 0.18, 0.55), 0.1, 0.4)
mat('chrome', (0.9, 0.9, 0.92), 1.0, 0.12)
mat('alu', (0.62, 0.64, 0.67), 1.0, 0.35)
mat('steel_dark', (0.04, 0.045, 0.05), 0.8, 0.5)
mat('plastic_dark', (0.025, 0.027, 0.03), 0.0, 0.55)
mat('rubber', (0.012, 0.012, 0.013), 0.0, 0.88)
mat('glass', (0.02, 0.03, 0.04), 0.0, 0.05, alpha=0.45)
mat('interior', (0.05, 0.05, 0.055), 0.0, 0.8)
mat('headlight', (1, 1, 1), 0.0, 0.1, emit=(1.0, 0.96, 0.88), strength=6)
mat('taillight', (0.5, 0.02, 0.02), 0.0, 0.2, emit=(1.0, 0.05, 0.03), strength=4)
mat('marker', (0.6, 0.3, 0.0), 0.0, 0.2, emit=(1.0, 0.45, 0.02), strength=3)
mat('plate', (0.85, 0.8, 0.2), 0.0, 0.5)
mat('reefer', (0.18, 0.19, 0.2), 0.4, 0.5)

# ───────── primitive helpers ─────────
PARTS = []

def _finish(o, m, bevel, seg, smooth):
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    o.data.materials.append(MATS[m])
    if bevel > 0:
        b = o.modifiers.new('bev', 'BEVEL')
        b.width = bevel; b.segments = seg; b.limit_method = 'ANGLE'; b.angle_limit = math.radians(35)
    if smooth:
        for poly in o.data.polygons:
            poly.use_smooth = True
    PARTS.append(o)
    return o

def box(m, x0, x1, y0, y1, z0, z1, bevel=0.0, seg=2, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), rotation=rot)
    o = bpy.context.active_object
    o.scale = (abs(x1 - x0), abs(y1 - y0), abs(z1 - z0))
    return _finish(o, m, bevel, seg, bevel > 0)

def cyl(m, r, depth, loc, axis='Z', verts=24, bevel=0.0, seg=2, r2=None):
    rot = {'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0), 'Z': (0, 0, 0)}[axis]
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object
    return _finish(o, m, bevel, seg, True)

def half_cyl(m, r, depth, loc, thick=0.04, verts=32):
    """Wheel-arch fender: upper half of a hollow cylinder, axis along Y."""
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=(math.pi / 2, 0, 0))
    o = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=Vector((0, 0, 0)), plane_no=Vector((0, 0, -1)), clear_inner=False, clear_outer=True)
    # remove cap faces so it is an open shell
    caps = [f for f in bm.faces if abs(f.normal.y) > 0.9]
    bmesh.ops.delete(bm, geom=caps, context='FACES')
    bm.to_mesh(o.data); bm.free()
    s = o.modifiers.new('sol', 'SOLIDIFY'); s.thickness = thick
    return _finish(o, m, 0, 1, True)

def wheel(x, y, outward, r=0.52, w=0.31):
    """Tyre + rim + hub + lug nuts. outward = +1 / -1 (which side the rim face points)."""
    cyl('rubber', r, w, (x, y, r), 'Y', verts=48, bevel=0.07, seg=3)
    cyl('rubber', r * 0.78, w + 0.02, (x, y, r), 'Y', verts=40)   # sidewall inner ring
    cyl('alu', r * 0.62, w * 0.5, (x, y + outward * w * 0.27, r), 'Y', verts=40, bevel=0.015)
    cyl('steel_dark', r * 0.5, w * 0.52, (x, y + outward * w * 0.28, r), 'Y', verts=32)
    cyl('chrome', r * 0.24, w * 0.6, (x, y + outward * w * 0.32, r), 'Y', verts=24, bevel=0.02)
    cyl('chrome', r * 0.1, w * 0.72, (x, y + outward * w * 0.34, r), 'Y', verts=12)
    for i in range(10):
        a = i / 10 * math.tau
        cyl('chrome', 0.022, w * 0.66, (x + math.cos(a) * r * 0.36, y + outward * w * 0.33, r + math.sin(a) * r * 0.36), 'Y', verts=6)

def axle(x, track, dual=False, r=0.52):
    for s in (-1, 1):
        if dual:
            wheel(x, s * (track / 2 - 0.17), s, r)
            wheel(x, s * (track / 2 + 0.17), s, r)
        else:
            wheel(x, s * track / 2, s, r)
    cyl('steel_dark', 0.08, track - 0.2, (x, 0, r), 'Y', verts=12)
    box('steel_dark', x - 0.12, x + 0.12, -0.25, 0.25, r - 0.12, r + 0.12)   # differential / beam hub

def join(name):
    bpy.ops.object.select_all(action='DESELECT')
    for o in PARTS:
        o.select_set(True)
    bpy.context.view_layer.objects.active = PARTS[0]
    for o in PARTS:
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.context.view_layer.objects.active = PARTS[0]
    bpy.ops.object.join()
    o = bpy.context.active_object
    o.name = name
    PARTS.clear()
    return o

# ───────── cab-over tractor cab ─────────
def cab(W=2.5, paint='paint_blue', L=2.3, x_front=1.35):
    xf, xb = x_front, x_front - L
    hw = W / 2
    z0, z1 = 1.12, 3.55
    box(paint, xb, xf, -hw, hw, z0, z1, bevel=0.14, seg=4)
    # roof fairing + sun visor
    box(paint, xb + 0.1, xf - 0.35, -hw + 0.08, hw - 0.08, z1 - 0.05, z1 + 0.42, bevel=0.18, seg=4)
    box('plastic_dark', xf - 0.05, xf + 0.18, -hw + 0.1, hw - 0.1, z1 - 0.18, z1 - 0.06, bevel=0.03)
    # windshield: black frame + glass, two-piece with centre pillar
    box('plastic_dark', xf - 0.02, xf + 0.025, -hw + 0.1, hw - 0.1, 2.28, 3.32, bevel=0.03)
    box('glass', xf + 0.02, xf + 0.035, -hw + 0.16, hw - 0.16, 2.34, 3.26)
    box('plastic_dark', xf + 0.03, xf + 0.045, -0.025, 0.025, 2.34, 3.26)
    # wipers
    for s in (-0.55, 0.45):
        box('plastic_dark', xf + 0.04, xf + 0.06, s, s + 0.6, 2.38, 2.41, rot=(0.35, 0, 0))
    # grille with chrome slats + badge
    box('plastic_dark', xf - 0.02, xf + 0.05, -hw + 0.32, hw - 0.32, 1.52, 2.2, bevel=0.02)
    for i in range(6):
        z = 1.6 + i * 0.1
        box('chrome', xf + 0.05, xf + 0.07, -hw + 0.36, hw - 0.36, z, z + 0.03)
    box('chrome', xf + 0.05, xf + 0.08, -0.2, 0.2, 2.06, 2.14, bevel=0.01)
    # headlights (emissive) in chrome bezels
    for s in (-1, 1):
        box('chrome', xf - 0.01, xf + 0.06, s * (hw - 0.62), s * (hw - 0.1), 1.3, 1.52, bevel=0.02)
        box('headlight', xf + 0.05, xf + 0.07, s * (hw - 0.58), s * (hw - 0.34), 1.34, 1.48)
        box('marker', xf + 0.05, xf + 0.07, s * (hw - 0.32), s * (hw - 0.14), 1.34, 1.48)
    # bumper + fog lights + plate
    box('plastic_dark', xf - 0.15, xf + 0.18, -hw, hw, 0.62, 1.12, bevel=0.06, seg=3)
    for s in (-1, 1):
        cyl('headlight', 0.07, 0.04, (xf + 0.19, s * (hw - 0.35), 0.82), 'X', verts=16)
    box('plate', xf + 0.18, xf + 0.19, -0.26, 0.26, 0.72, 0.84)
    # side windows, door seams, handles, steps, mirrors
    for s in (-1, 1):
        y = s * hw
        box('glass', xf - 1.05, xf - 0.22, y - 0.01 * s, y + 0.012 * s, 2.42, 3.25)
        box('plastic_dark', xf - 1.1, xf - 0.17, y - 0.005 * s, y + 0.008 * s, 2.37, 2.42)
        box('plastic_dark', xf - 1.15, xf - 1.12, y - 0.004 * s, y + 0.01 * s, 1.2, 3.3)   # door rear seam
        box('chrome', xf - 1.0, xf - 0.82, y, y + 0.03 * s, 2.15, 2.2)                    # handle
        box('steel_dark', xf - 1.0, xf - 0.2, y - 0.25 * s, y + 0.02 * s, 0.42, 0.48)        # step 1
        box('steel_dark', xf - 1.0, xf - 0.2, y - 0.2 * s, y + 0.02 * s, 0.82, 0.88)         # step 2
        box('chrome', xf - 1.1, xf - 1.06, y + 0.0, y + 0.03 * s, 1.4, 2.9)                 # grab rail
        # mirror arm + housings
        box('plastic_dark', xf - 0.12, xf - 0.06, y, y + 0.38 * s, 3.05, 3.1)
        box('plastic_dark', xf - 0.12, xf - 0.06, y, y + 0.38 * s, 2.45, 2.5)
        box('plastic_dark', xf - 0.2, xf - 0.04, y + 0.32 * s, y + 0.5 * s, 2.4, 3.15, bevel=0.03)
        box('chrome', xf - 0.21, xf - 0.19, y + 0.34 * s, y + 0.48 * s, 2.45, 3.1)
        box('marker', xf - 0.4, xf - 0.32, y - 0.002 * s, y + 0.015 * s, 3.6, 3.66)         # roof side marker
    # roof marker lights
    for i in range(5):
        yy = -0.6 + i * 0.3
        box('marker', xf - 0.32, xf - 0.26, yy - 0.05, yy + 0.05, z1 + 0.37, z1 + 0.42)
    # interior seen through glass: dash, wheel, seats
    box('interior', xf - 0.5, xf - 0.05, -hw + 0.15, hw - 0.15, 2.0, 2.3)
    cyl('interior', 0.2, 0.04, (xf - 0.45, 0.6, 2.45), 'X', verts=20)
    for s in (-1, 1):
        box('interior', xf - 1.3, xf - 0.85, s * 0.6 - 0.25, s * 0.6 + 0.25, 1.9, 2.95, bevel=0.05)
    box('interior', xb + 0.05, xb + 0.15, -hw + 0.1, hw - 0.1, 1.5, 3.4)                     # back wall
    return xb

def chassis(x0, x1, z=0.95, half=0.45):
    for s in (-1, 1):
        box('steel_dark', x1, x0, s * half - 0.06, s * half + 0.06, z, z + 0.28)
    n = int((x0 - x1) / 1.0)
    for i in range(n + 1):
        x = x1 + i * (x0 - x1) / n
        box('steel_dark', x - 0.05, x + 0.05, -half, half, z + 0.04, z + 0.22)

def fender(x, r=0.52, width=0.5, hw=1.25):
    for s in (-1, 1):
        half_cyl('plastic_dark', r + 0.12, width, (x, s * (hw - width / 2 + 0.02), r))

# ════════════ 1. Semi: tractor + 13.6m box trailer ════════════
def build_semi():
    W, hw = 2.5, 1.25
    xb = cab(W, 'paint_blue')
    axle(0.0, 2.06)                                   # steer axle (origin)
    axle(-3.6, 1.86, dual=True); axle(-4.95, 1.86, dual=True)
    chassis(1.0, -5.9)
    fender(0.0, hw=hw)
    # rear mudguards + flaps
    for s in (-1, 1):
        box('plastic_dark', -5.6, -2.95, s * 0.7, s * 1.27, 1.17, 1.22)
        for x in (-2.95, -5.6):
            box('rubber', x - 0.02, x + 0.02, s * 0.75, s * 1.25, 0.25, 1.17)
    # fuel tank (alu) + battery box + air tanks
    cyl('alu', 0.32, 1.3, (-1.85, -0.92, 0.8), 'X', verts=32, bevel=0.03)
    for xx in (-2.35, -1.35):
        box('steel_dark', xx - 0.03, xx + 0.03, -1.27, -0.6, 0.45, 1.15)
    box('steel_dark', -2.5, -1.4, 0.65, 1.2, 0.5, 1.05, bevel=0.03)
    cyl('alu', 0.13, 1.0, (-2.6, 0.75, 0.6), 'X', verts=16)
    # exhaust stack with heat shield, behind cab
    cyl('chrome', 0.075, 2.9, (xb - 0.15, 1.0, 2.5), 'Z', verts=20)
    cyl('chrome', 0.11, 0.9, (xb - 0.15, 1.0, 3.2), 'Z', verts=20)
    # cab-back: air lines, catwalk plate, lights
    box('grate' if 'grate' in MATS else 'steel_dark', xb - 0.75, xb - 0.05, -0.5, 0.5, 1.22, 1.26)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.015, location=(xb - 0.3, -0.25, 1.75), rotation=(0, math.pi / 2, 0))
    _finish(bpy.context.active_object, 'paint_red', 0, 1, True)
    bpy.ops.mesh.primitive_torus_add(major_radius=0.18, minor_radius=0.015, location=(xb - 0.3, 0.05, 1.75), rotation=(0, math.pi / 2, 0))
    _finish(bpy.context.active_object, 'stripe_blue', 0, 1, True)
    # fifth wheel
    cyl('steel_dark', 0.55, 0.12, (-4.3, 0, 1.3), 'Z', verts=32, bevel=0.02)
    box('steel_dark', -4.9, -3.7, -0.5, 0.5, 1.2, 1.26)
    # tractor tail lights
    for s in (-1, 1):
        box('taillight', -5.92, -5.88, s * 0.85, s * 1.15, 0.95, 1.05)

    # ── trailer (kingpin over fifth wheel) ──
    tf, tl = -3.1, 13.6
    tb = tf - tl
    th0, th1, thw = 1.32, 4.0, 1.28
    box('paint_white', tb, tf, -thw, thw, th0, th1, bevel=0.035, seg=2)
    # corrugated side posts + rails
    n = int(tl / 0.6)
    for i in range(1, n):
        x = tb + i * tl / n
        for s in (-1, 1):
            box('paint_white', x - 0.03, x + 0.03, s * thw, s * (thw + 0.025), th0 + 0.05, th1 - 0.05)
    for s in (-1, 1):
        box('alu', tb, tf, s * (thw - 0.01), s * (thw + 0.04), th1 - 0.1, th1)
        box('alu', tb, tf, s * (thw - 0.01), s * (thw + 0.05), th0, th0 + 0.16)
        box('stripe_blue', tb + 0.3, tf - 0.3, s * (thw + 0.026), s * (thw + 0.03), 1.55, 1.75)
        box('stripe_blue', tb + 0.3, tf - 0.3, s * (thw + 0.026), s * (thw + 0.03), 1.8, 1.85)
        for i in range(6):                                                   # side marker lamps
            x = tb + 0.5 + i * (tl - 1.0) / 5
            box('marker', x - 0.05, x + 0.05, s * (thw + 0.04), s * (thw + 0.07), th0 + 0.02, th0 + 0.1)
        # side underrun guard
        for z in (0.55, 0.85):
            box('alu', tb + 4.2, tf - 3.6, s * (thw - 0.08), s * (thw - 0.02), z, z + 0.08)
        for x in (tf - 3.6, tf - 6.0, tb + 4.2):
            box('steel_dark', x - 0.04, x + 0.04, s * (thw - 0.1), s * (thw - 0.03), 0.5, th0)
    # reefer unit on front wall
    box('reefer', tf, tf + 0.42, -0.95, 0.95, 2.45, 3.85, bevel=0.06, seg=3)
    for i in range(7):
        z = 2.6 + i * 0.17
        box('plastic_dark', tf + 0.42, tf + 0.44, -0.85, 0.85, z, z + 0.07)
    # trailer chassis, landing gear, axles
    chassis(tf, tb + 0.4, z=1.02, half=0.5)
    for s in (-1, 1):
        box('steel_dark', tf - 2.6, tf - 2.45, s * 0.85, s * 0.98, 0.15, 1.05)
        box('steel_dark', tf - 2.75, tf - 2.3, s * 0.78, s * 1.05, 0.0, 0.08)
    box('steel_dark', tf - 2.55, tf - 2.5, -0.9, 0.9, 0.6, 0.65)
    ta = [tb + 1.6, tb + 2.95, tb + 4.3]
    for x in ta:
        axle(x, 1.86, dual=True)
    for s in (-1, 1):
        box('plastic_dark', ta[-1] - 0.7, ta[0] + 0.7, s * 0.7, s * thw, 1.2, 1.25)
        box('rubber', ta[0] + 0.66, ta[0] + 0.7, s * 0.75, s * 1.25, 0.25, 1.2)
    # rear frame, doors, lock bars, lights, underride bar, plate
    box('alu', tb - 0.06, tb + 0.02, -thw, thw, th0, th0 + 0.12)
    box('alu', tb - 0.06, tb + 0.02, -thw, thw, th1 - 0.12, th1)
    for s in (-1, 1):
        box('alu', tb - 0.06, tb + 0.02, s * (thw - 0.1), s * thw, th0, th1)
    box('alu', tb - 0.05, tb + 0.0, -0.01, 0.01, th0 + 0.1, th1 - 0.1)
    for yy in (-0.85, -0.35, 0.35, 0.85):
        cyl('chrome', 0.022, th1 - th0 - 0.3, (tb - 0.08, yy, (th0 + th1) / 2), 'Z', verts=10)
        box('chrome', tb - 0.12, tb - 0.04, yy - 0.02, yy + 0.18, 2.1, 2.16)
    for s in (-1, 1):
        box('taillight', tb - 0.07, tb - 0.03, s * 0.75, s * 1.15, th0 + 0.15, th0 + 0.35)
        box('marker', tb - 0.07, tb - 0.03, s * 1.05, s * 1.2, th1 - 0.22, th1 - 0.14)
    box('steel_dark', tb - 0.1, tb + 0.1, -1.1, 1.1, 0.45, 0.6)
    for yy in (-0.9, 0.9):
        box('steel_dark', tb + 0.0, tb + 0.08, yy - 0.04, yy + 0.04, 0.55, 1.1)
    box('plate', tb - 0.11, tb - 0.1, -0.26, 0.26, 0.6, 0.72)
    o = join('truck_semi')
    return o

# ════════════ 2. Rigid box truck ════════════
def build_box():
    W, hw = 2.4, 1.2
    xb = cab(W, 'paint_white', L=2.1, x_front=1.3)
    # blue accent band on cab
    for s in (-1, 1):
        box('stripe_blue', xb + 0.15, 1.2, s * hw - 0.005 * s, s * hw + 0.012 * s, 1.75, 1.9)
    axle(0.0, 2.0); axle(-4.4, 1.82, dual=True)
    chassis(1.0, -6.6, z=0.92)
    fender(0.0, hw=hw)
    cyl('alu', 0.28, 1.0, (-1.6, -0.9, 0.78), 'X', verts=32, bevel=0.03)
    cyl('chrome', 0.06, 0.6, (-1.1, 1.0, 0.6), 'X', verts=16)                  # side exhaust
    # box body
    bf, bl = xb - 0.12, 6.6
    bbk = bf - bl
    z0, z1, bhw = 1.3, 3.75, 1.26
    box('paint_white', bbk, bf, -bhw, bhw, z0, z1, bevel=0.03)
    box('alu', bbk, bf, -bhw - 0.03, bhw + 0.03, z1 - 0.08, z1 + 0.02)
    box('alu', bbk, bf, -bhw - 0.04, bhw + 0.04, z0, z0 + 0.14)
    for i in range(1, 11):
        x = bbk + i * bl / 11
        for s in (-1, 1):
            box('alu', x - 0.025, x + 0.025, s * bhw, s * (bhw + 0.02), z0 + 0.14, z1 - 0.08)
    for s in (-1, 1):
        box('stripe_blue', bbk + 0.4, bf - 0.4, s * (bhw + 0.021), s * (bhw + 0.024), 2.1, 2.5)
        for i in range(4):
            x = bbk + 0.4 + i * (bl - 0.8) / 3
            box('marker', x - 0.05, x + 0.05, s * (bhw + 0.03), s * (bhw + 0.06), z0 + 0.02, z0 + 0.1)
        box('alu', bbk + 0.6, xb - 1.6, s * (bhw - 0.08), s * (bhw - 0.02), 0.6, 0.68)
    # roll-up rear door with slats
    box('alu', bbk - 0.05, bbk + 0.01, -bhw, bhw, z0, z1)
    for i in range(14):
        z = z0 + 0.12 + i * 0.165
        box('paint_white', bbk - 0.07, bbk - 0.04, -bhw + 0.1, bhw - 0.1, z, z + 0.14)
    box('chrome', bbk - 0.1, bbk - 0.06, -0.25, 0.25, z0 + 0.18, z0 + 0.24)
    # tail lift platform (stowed) + lights
    box('alu', bbk - 0.35, bbk - 0.05, -1.15, 1.15, 0.55, 1.25)
    for i in range(6):
        y = -1.0 + i * 0.4
        box('steel_dark', bbk - 0.36, bbk - 0.34, y - 0.02, y + 0.02, 0.58, 1.22)
    for s in (-1, 1):
        box('taillight', bbk - 0.38, bbk - 0.34, s * 0.75, s * 1.12, 1.27, 1.42)
        box('marker', bbk - 0.07, bbk - 0.03, s * 1.08, s * 1.22, z1 - 0.2, z1 - 0.12)
        box('plastic_dark', -5.2, -3.6, s * 0.7, s * 1.22, 1.15, 1.2)
        box('rubber', -5.2, -5.16, s * 0.75, s * 1.2, 0.25, 1.15)
    box('plate', bbk - 0.37, bbk - 0.36, -0.26, 0.26, 0.75, 0.87)
    return join('truck_box')

def export(obj, path):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    except Exception as e:
        print('smooth-by-angle unavailable:', e)
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_apply=True, export_yup=True)
    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    print(f'EXPORTED {path}  ~{tris} tris')

semi = build_semi()
export(semi, os.path.join(OUT, 'truck_semi.glb'))
semi.hide_set(True)
semi.select_set(False)
boxtruck = build_box()
export(boxtruck, os.path.join(OUT, 'truck_box.glb'))
