import bpy
for n in ('ChairW1','ChairW1_back','Curtain_0','Curtain_1'):
    o=bpy.data.objects[n]; import mathutils
    vs=[o.matrix_world@mathutils.Vector(c) for c in o.bound_box]
    print(n,[round(min(v[i] for v in vs),2) for i in range(3)],[round(max(v[i] for v in vs),2) for i in range(3)])
