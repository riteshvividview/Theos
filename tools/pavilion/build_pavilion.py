"""Builds the glass pavilion from public/3D-Model-to-create.

Run: blender -b -P tools/pavilion/build_pavilion.py -- <out_dir>
Writes pavilion.blend, pavilion.glb and preview renders.

Naming contract for the web page:
  Room_<id>_light   point lights (KHR_lights_punctual) per room, hover glows them
  Room_<id>_cove    emissive LED cove strip per room
  Room_<id>_hit     invisible box per room, used for raycasting
  Curtain_<n>       pleated curtain; shape key "Open" gathers it to one side
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector

out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else os.path.dirname(__file__)
os.makedirs(out, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

# ---------- dimensions (metres) ----------
L, D = 34.0, 9.0            # roof / floor slab footprint
GL, GD = 30.4, 6.2          # glass box
H = 3.0                     # floor to ceiling
FLOOR_Z = 1.6               # top of the floor slab above the ground plate
SLAB = .32                  # slab thickness
MUL = .09                   # black mullion width

# ---------- materials ----------
def mat(name, color, rough=.5, metal=0., emit=None, strength=0., alpha=1., transmission=0.):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1)
        b.inputs['Emission Strength'].default_value = strength
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        m.surface_render_method = 'BLENDED'
    return m

M = {
    'slab': mat('Slab_White', (.93, .925, .91), .35),
    'steel': mat('Steel_Black', (.012, .012, .012), .35, .6),
    'plinth': mat('Plinth_Graphite', (.06, .06, .062), .55, .2),
    'glass': mat('Glass', (.9, .93, .92), .02, alpha=.04),
    'wall': mat('Wall_Cream', (.86, .78, .64), .6),
    'ceiling': mat('Ceiling_Warm', (.85, .80, .70), .7),
    'floor': mat('Floor_Oak_Pale', (.62, .52, .40), .45),
    'walnut': mat('Walnut', (.17, .10, .06), .4),
    'curtain': mat('Curtain_Charcoal', (.025, .025, .028), 1.),
    'fabric': mat('Fabric_Grey', (.12, .12, .12), .85),
    'fabric_lt': mat('Fabric_Taupe', (.38, .34, .30), .85),
    'stone': mat('Stone_Dark', (.04, .04, .04), .3),
    'cove': mat('LED_Cove', (1, .8, .55), .5, emit=(1, .70, .42), strength=14),
    'art': mat('Art_Print', (.05, .05, .05), .6),
    'hit': mat('Hit_Invisible', (1, 1, 1), alpha=0.),
}

def box(name, size, loc, material, rot_z=0., bevel=0.):
    """An axis-aligned cuboid built from data (no operators, so nothing depends on selection)."""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.location = loc; o.rotation_euler.z = rot_z
    if bevel:
        mod = o.modifiers.new('bevel', 'BEVEL'); mod.width = bevel; mod.segments = 2
    o.data.materials.append(material)
    return o

def tapered_slab(name, top, bottom, z0, z1, material):
    """A slab whose top and bottom faces differ in size, for the chamfered edges."""
    bm = bmesh.new()
    (tl, td), (bl, bd) = top, bottom
    vs = [bm.verts.new((sx * bl / 2, sy * bd / 2, z0)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    vt = [bm.verts.new((sx * tl / 2, sy * td / 2, z1)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    bm.faces.new(vs[::-1]); bm.faces.new(vt)
    for i in range(4):
        j = (i + 1) % 4; bm.faces.new((vs[i], vs[j], vt[j], vt[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(material)
    return o

# ---------- structure ----------
# Floor slab: thin top edge, the underside steps in (chamfer seen in every elevation).
tapered_slab('Floor_Slab', (L, D), (L - .9, D - .9), FLOOR_Z - SLAB, FLOOR_Z, M['slab'])
# Roof slab: wide flat top, chamfered underside.
roof_z = FLOOR_Z + H
tapered_slab('Roof_Slab', (L, D), (L - 1.0, D - 1.0), roof_z, roof_z + .26, M['slab'])
box('Roof_Fascia', (L, D, .06), (0, 0, roof_z + .29), M['slab'])

# Below the floor: graphite keel, central stem and the ground plate, offset as in the photos.
keel = tapered_slab('Keel', (12, 3.2), (11, 2.6), FLOOR_Z - SLAB - .45, FLOOR_Z - SLAB, M['plinth'])
keel.location.x = -1.5
box('Stem', (4.2, 1.4, .55), (-1.5, 0, .55), M['plinth'])
box('Ground_Plate', (24, 6.4, .28), (-.5, 0, .14), M['plinth'])
box('Rear_Column', (.35, .35, FLOOR_Z - SLAB), (8.6, 2.2, (FLOOR_Z - SLAB) / 2), M['steel'])
box('Plate_Foot', (.25, .25, .45), (8.6, 2.6, -.2), M['steel'])
for x in (-11, -1.5, 9):  # bolt plates on the plate underside
    for y in (-2.6, 2.6):
        box(f'Bolt_Plate_{x}_{y}', (.5, .35, .02), (x, y, -.01), M['steel'])

# ---------- glass box ----------
z_mid = FLOOR_Z + H / 2
bays = [-GL / 2, -12.6, -9.0, -6.2, -3.4, -.2, 3.0, 5.0, 7.4, 10.0, 12.8, GL / 2]
for side in (-1, 1):
    y = side * GD / 2
    for i, x in enumerate(bays):
        box(f'Mullion_{side}_{i}', (MUL, MUL, H), (x, y, z_mid), M['steel'])
    box(f'Glass_{side}', (GL, .02, H), (0, y, z_mid), M['glass'])
    box(f'Head_{side}', (GL, MUL, MUL), (0, y, FLOOR_Z + H - MUL / 2), M['steel'])
    box(f'Sill_{side}', (GL, MUL, MUL), (0, y, FLOOR_Z + MUL / 2), M['steel'])
for side in (-1, 1):
    x = side * GL / 2
    for t in (-GD / 2, -GD / 6, GD / 6, GD / 2):
        box(f'EndMullion_{side}_{t:.1f}', (MUL, MUL, H), (x, t, z_mid), M['steel'])
    box(f'EndGlass_{side}', (.02, GD, H), (x, 0, z_mid), M['glass'])

# Interior shell
box('Interior_Floor', (GL - .1, GD - .1, .02), (0, 0, FLOOR_Z + .01), M['floor'])
box('Interior_Ceiling', (GL - .1, GD - .1, .04), (0, 0, FLOOR_Z + H - .02), M['ceiling'])
box('Core_Wall', (GL - 3.4, .3, H - .05), (0, 1.2, z_mid), M['wall'])

# ---------- rooms ----------
# id, x range, label (left to right on the front elevation)
ROOMS = [
    ('lounge_west', (-15.2, -9.0)),
    ('kitchen', (-9.0, -3.4)),
    ('dining', (-3.4, 3.0)),
    ('living', (3.0, 7.4)),
    ('lounge_east', (7.4, 12.8)),
    ('bedroom', (12.8, 15.2)),
]
for rid, (x0, x1) in ROOMS:
    cx, w = (x0 + x1) / 2, x1 - x0
    # Cove strip along the ceiling edge on the glass side, as in the photos.
    box(f'Room_{rid}_cove', (w - .3, .05, .04), (cx, -GD / 2 + .35, FLOOR_Z + H - .08), M['cove'])
    bpy.ops.object.light_add(type='POINT', location=(cx, -.9, FLOOR_Z + H - .5))
    lt = bpy.context.object; lt.name = f'Room_{rid}_light'
    lt.data.energy = 420; lt.data.color = (1, .72, .45); lt.data.shadow_soft_size = .6
    hit = box(f'Room_{rid}_hit', (w, GD, H), (cx, 0, z_mid), M['hit'])
    hit.hide_render = True

# Partition fins between rooms (white walls that read as panels through the glass)
for x in (-9.0, -3.4, 7.4, 12.8):
    box(f'Partition_{x}', (.12, 2.4, H - .05), (x, -.1, z_mid), M['wall'])

# ---------- curtains ----------
def curtain(name, x0, x1, y, folds=None):
    w = x1 - x0; folds = folds or max(8, int(w * 7))
    res_x, res_z = folds * 6, 24
    bm = bmesh.new()
    grid = []
    for k in range(res_z + 1):
        row = []
        for i in range(res_x + 1):
            u = i / res_x
            row.append(bm.verts.new((x0 + u * w, y + .09 * math.sin(u * folds * 2 * math.pi), FLOOR_Z + .03 + k / res_z * (H - .1))))
        grid.append(row)
    for k in range(res_z):
        for i in range(res_x):
            bm.faces.new((grid[k][i], grid[k][i + 1], grid[k + 1][i + 1], grid[k + 1][i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); scene.collection.objects.link(o)
    o.data.materials.append(M['curtain'])
    for p in me.polygons: p.use_smooth = True
    # Shape keys: Basis = drawn, Open = gathered toward x0 with deeper pleats.
    o.shape_key_add(name='Basis', from_mix=False)
    sk = o.shape_key_add(name='Open')
    gather = min(.7, w * .18)
    for v, kv in zip(me.vertices, sk.data):
        u = (v.co.x - x0) / w
        sway = .015 * math.sin(v.co.z * 3.1)
        kv.co = Vector((x0 + u * gather, y + .16 * math.sin(u * folds * 2 * math.pi) + sway, v.co.z))
    sk.value = 0; o.active_shape_key_index = 0
    return o

CURTAINS = [(-12.4, -9.1), (10.0, 12.6)]
for n, (a, b) in enumerate(CURTAINS):
    curtain(f'Curtain_{n}', a, b, -GD / 2 + .18)
# Rear-side curtains seen in the rear elevation
for n, (a, b) in enumerate([(-13.8, -10.4), (10.6, 13.6), (-8.8, -7.4), (7.6, 9.2)]):
    curtain(f'Curtain_rear_{n}', a, b, GD / 2 - .18)

# ---------- furniture (simple, faithful massing) ----------
def lounge_chair(name, x, y, rot=0):
    def part(n, size, local, material, bevel=0., tilt=0.):
        lx, ly, lz = local
        wx = x + lx * math.cos(rot) - ly * math.sin(rot); wy = y + lx * math.sin(rot) + ly * math.cos(rot)
        o = box(f'{name}_{n}', size, (wx, wy, FLOOR_Z + lz), material, rot_z=rot, bevel=bevel)
        o.rotation_euler.x = tilt
        return o
    part('seat', (.75, .8, .12), (0, 0, .38), M['fabric_lt'], .04)
    part('back', (.75, .12, .7), (0, .38, .72), M['fabric_lt'], .04, math.radians(-18))
    for dx in (-.3, .3):
        part(f'leg{dx}', (.03, .7, .03), (dx, 0, .2), M['steel'])

def dining_chair(name, x, y):
    box(f'{name}_seat', (.45, .45, .04), (x, y, FLOOR_Z + .46), M['walnut'])
    box(f'{name}_back', (.45, .03, .42), (x, y + .21, FLOOR_Z + .7), M['walnut'])
    for dx in (-.2, .2):
        for dy in (-.2, .2):
            box(f'{name}_leg', (.03, .03, .46), (x + dx, y + dy, FLOOR_Z + .23), M['walnut'])

lounge_chair('ChairW1', -13.6, -.6, .4); lounge_chair('ChairW2', -11.8, -.4, -.4)
box('SideTable_W', (.5, .5, .4), (-12.7, -1.2, FLOOR_Z + .2), M['stone'])
box('Kitchen_Island', (3.2, 1.0, .92), (-6.2, -.7, FLOOR_Z + .46), M['stone'])
box('Kitchen_Top', (3.3, 1.05, .04), (-6.2, -.7, FLOOR_Z + .94), M['wall'])
box('Kitchen_Tall', (3.6, .6, H - .1), (-6.2, .8, z_mid), M['walnut'])
box('Dining_Table', (2.0, .95, .04), (-.2, -.6, FLOOR_Z + .74), M['wall'])
for dx in (-.95, .95):
    box('Dining_TableLeg', (.04, .8, .72), (-.2 + dx * .9, -.6, FLOOR_Z + .36), M['steel'])
for dx in (-.6, .6):
    for dy in (-1.2, 0):
        dining_chair('DChair', -.2 + dx, -.6 + dy * .9 + .5, )
box('Sofa_Base', (2.8, .95, .42), (5.2, .3, FLOOR_Z + .21), M['fabric'], bevel=.05)
box('Sofa_Back', (2.8, .25, .38), (5.2, .7, FLOOR_Z + .6), M['fabric'], bevel=.05)
box('Art_Frame', (1.1, .03, 1.1), (5.2, 1.04, FLOOR_Z + 1.75), M['wall'])
box('Art_Print', (.9, .035, .9), (5.2, 1.03, FLOOR_Z + 1.75), M['art'])
lounge_chair('ChairE1', 8.6, -.5, .5); lounge_chair('ChairE2', 11.0, -.4, -.5)
box('Ottoman_E', (.6, .5, .35), (9.6, -1.4, FLOOR_Z + .18), M['fabric'], bevel=.03)
box('Bed_Base', (1.9, 2.1, .4), (14.0, .3, FLOOR_Z + .2), M['fabric'], bevel=.04)
box('Bed_Head', (1.9, .12, .9), (14.0, 1.35, FLOOR_Z + .45), M['walnut'])
box('Rug_Living', (3.4, 2.6, .01), (5.2, -.4, FLOOR_Z + .025), M['fabric_lt'])

# ---------- world, camera, render ----------
world = bpy.data.worlds.new('World'); scene.world = world; world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (1, 1, 1, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .8
bpy.ops.object.light_add(type='SUN', location=(0, -20, 20)); sun = bpy.context.object
sun.name = 'Sun_Key'; sun.data.energy = 1.2; sun.rotation_euler = (math.radians(55), 0, math.radians(-20))

scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x, scene.render.resolution_y = 2170, 725
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'; scene.view_settings.look = 'None'

def shot(name, loc, target, lens=50, ortho=None):
    cam_data = bpy.data.cameras.new(name)
    if ortho: cam_data.type = 'ORTHO'; cam_data.ortho_scale = ortho
    cam_data.lens = lens
    cam = bpy.data.objects.new(name, cam_data); scene.collection.objects.link(cam)
    cam.location = loc
    cam.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    scene.render.filepath = os.path.join(out, f'preview_{name}.png')
    bpy.ops.render.render(write_still=True)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out, 'pavilion.blend'))
shot('front_3q', (-22, -34, 5.5), (0, 0, 2.4), 50)
shot('rear_elev', (0, -60, 2.6), (0, 0, 2.6), ortho=37)
shot('end_elev', (40, 0, 3.0), (0, 0, 2.6), 50)

# GLB for the page: lights included, shape keys kept (curtains open as morph targets).
bpy.ops.export_scene.gltf(filepath=os.path.join(out, 'pavilion.glb'), export_format='GLB',
                          export_lights=True, export_morph=True, export_apply=False)
M['curtain'].use_backface_culling = False
print('DONE', out)
