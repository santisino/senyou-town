"""Opening-day editable production scene; Blender source of all visible world geometry."""
import bpy, math, random, os, json
from mathutils import Vector

random.seed(923)
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'build','opening-day'); WEB=os.path.join(ROOT,'assets')
os.makedirs(OUT,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={}; groups={}; buckets={}; G='Landscape'
def mat(name,hex,rough=.8,emit=0):
 c=[int(hex[i:i+2],16)/255 for i in (0,2,4)];c=[v/12.92 if v<.04045 else ((v+.055)/1.055)**2.4 for v in c]
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*c,1);p.inputs['Emission Strength'].default_value=emit
 M[name]=m
for n,c in [('wood','D7AF78'),('lightwood','EACDA2'),('beam','AF8156'),('cream','F3E4C9'),('roof','829475'),('terracotta','C78160'),('rooflight','A2B292'),('bark','9E7650'),('grass','88A668'),('moss','729357'),('leaf','57814C'),('leaflight','8CAB62'),('leafdark','416B45'),('stone','DCCCB0'),('earth','B19B70'),('water','6FAFA5'),('ink','355447'),('paper','F9EED7'),('gold','DDB565'),('flower','E8B06F'),('pink','DC9B99'),('linen','E5D8B7'),('archive','C59868')]:mat(n,c)
mat('glow','FFE1A0',.4,1.2);mat('energy','BEE390',.4,.3)
def group(name,loc=(0,0,0),angle=0):
 global G
 G=name
 if name in groups:return groups[name]
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler.z=angle;groups[name]=o
 return o
def mesh(mat,vs,fs,smooth=False):
 key=(G,mat)
 if key not in buckets:buckets[key]=[[],[],[]]
 v,f,s=buckets[key];n=len(v);v.extend(vs);f.extend(tuple(n+i for i in face) for face in fs);s.extend([smooth]*len(fs))
def box(p,size,m='wood',a=0):
 x,y,z=p;w,d,h=[s/2 for s in size];co=math.cos(a);si=math.sin(a)
 vs=[(x+u*co-v*si,y+u*si+v*co,z+t) for u,v,t in [(-w,-d,-h),(w,-d,-h),(w,d,-h),(-w,d,-h),(-w,-d,h),(w,-d,h),(w,d,h),(-w,d,h)]]
 mesh(m,vs,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
def beam(a,b,r,m='beam',r2=None,n=8):
 a=Vector(a);b=Vector(b);d=(b-a).normalized();v=d.cross(Vector((0,0,1)))
 if v.length<.01:v=d.cross(Vector((0,1,0)))
 v.normalize();w=d.cross(v);r2=r if r2 is None else r2
 vs=[tuple(p+(math.cos(i*math.tau/n)*v+math.sin(i*math.tau/n)*w)*rr) for p,rr in [(a,r),(b,r2)] for i in range(n)]
 mesh(m,vs,[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)],True)
def ball(p,s,m='leaf',n=12,r=6):
 x,y,z=p;rx,ry,rz=s
 vs=[(x+rx*math.sin(j*math.pi/r)*math.cos(i*math.tau/n),y+ry*math.sin(j*math.pi/r)*math.sin(i*math.tau/n),z+rz*math.cos(j*math.pi/r)) for j in range(r+1) for i in range(n)]
 mesh(m,vs,[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(r) for i in range(n)],True)
def leaf(p,s,a,m):
 x,y,z=p;d=Vector((math.cos(a),math.sin(a),.2))*s;w=Vector((-math.sin(a),math.cos(a),0))*s*.38;p=Vector(p)
 mesh(m,[tuple(p-d),tuple(p+w),tuple(p+d),tuple(p-w),tuple(p+Vector((0,0,s*.2)))],[(0,1,4),(1,2,4),(2,3,4),(3,0,4)])
def tree(x,y,h=5,kind='oak'):
 beam((x,y,.1),(x+.15,y,h),.24,'bark',.06,10)
 for j in range(6):
  a=j*2.399;z=h*(.52+j*.067);end=(x+math.cos(a)*h*.28,y+math.sin(a)*h*.28,z+h*.16)
  beam((x,y,z),end,.1,'bark',.015)
  if kind=='saxaul':
   for k in range(8):beam(end,(end[0]+random.uniform(-.5,.5),end[1]+random.uniform(-.5,.5),end[2]+random.uniform(.3,.9)),.016,'leaf',.004,5)
  else:
   for k in range(380):
    b=random.random()*math.tau;v=random.uniform(-1,1);q=(random.random()**.3)*math.sqrt(1-v*v)
    p=(end[0]+math.cos(b)*q*h*.24,end[1]+math.sin(b)*q*h*.24,end[2]+v*h*.17)
    leaf(p,random.uniform(.18,.34),b,['leaflight','leaf','leafdark'][k%3])
def plant(x,y,z=.2,s=.22):
 beam((x,y,z),(x,y,z+s),s*.7,'terracotta',s)
 for j in range(7):
  a=j*2.4;leaf((x+math.cos(a)*s*.5,y+math.sin(a)*s*.5,z+s*1.6),s*.7,a,'leaf')
def lantern(x,y,z):
 beam((x,y,z),(x,y,z+1.7),.035,'ink');box((x,y,z+1.6),(.23,.23,.32),'glow');box((x,y,z+1.79),(.3,.3,.08),'ink')
def chair(x,y,z=0):
 for dx in [-.3,.3]:
  for dy in [-.3,.3]:beam((x+dx,y+dy,z),(x+dx,y+dy,z+.48),.045)
 box((x,y,z+.48),(.77,.72,.12),'lightwood');box((x,y+.31,z+.83),(.76,.12,.65),'wood')
def path(a,b,width=.9):
 d=Vector(b)-Vector(a);n=int(d.length/.4)+1
 for i in range(n):
  p=Vector(a)+d*(i+.5)/n
  perpendicular=Vector((-d.y,d.x,0)).normalized()
  for j in [-1,0,1]:
   offset=perpendicular*j*width*.32
   ball((p.x+offset.x,p.y+offset.y,.29),(.23,.25,.055),'stone',8,3)
def cabin(i,x,y,a):
 group('Cabin_%02d'%i,(x,y,0),a)
 for yy in range(24):box((0,-.3+(yy-12)*.19,.7),(4.4,.178,.14),'lightwood' if yy%4 else 'wood')
 for dx in [-1.65,1.65]:
  for dy in [-1.5,1.25]:beam((dx,dy,.05),(dx,dy,.75),.14)
 box((0,.25,1.87),(3.35,2.7,2.2),'cream')
 for j in range(13):
  z=.82+j*.17;box((0,-1.12,z),(3.42,.08,.145),'wood' if j%3 else 'lightwood')
  for dx in [-1.71,1.71]:box((dx,.25,z),(.08,2.75,.145),'lightwood')
 for dx in [-1.72,1.72]:box((dx,-1.16,1.84),(.12,.12,2.3),'beam')
 box((-.72,-1.2,1.52),(.84,.1,1.55),'roof');box((-.72,-1.27,1.84),(.52,.05,.6),'glow');ball((-.43,-1.33,1.38),(.04,.035,.04),'gold')
 box((.73,-1.2,1.95),(1.05,.1,1.05),'beam');box((.73,-1.26,1.95),(.89,.04,.89),'glow')
 for dx in [-.49,0,.49]:box((.73+dx,-1.3,1.95),(.055,.055,1.02),'cream')
 box((.73,-1.3,1.95),(1.02,.06,.055),'cream');box((.73,-1.43,1.4),(1.25,.43,.12),'wood')
 for xx in [.36,.72,1.08]:plant(xx,-1.42,1.45,.12)
 # Individually overlapping roof shingles and gable trim.
 roof='terracotta' if i%3==0 else 'roof';w=2.0;rise=1.22
 for y in [-1.12,1.6]:mesh('lightwood',[(-1.68,y,2.96),(1.68,y,2.96),(0,y,4.06)],[(0,1,2)])
 for side in [-1,1]:
  for row in range(8):
   for col in range(12):
    xa=side*w*row/8;xb=side*w*(row+1.15)/8;ya=-1.43+col*.29;yb=ya+.32
    za=3+rise*(1-abs(xa)/w);zb=3+rise*(1-abs(xb)/w)
    mesh(roof if (row+col)%5 else ('rooflight' if roof=='roof' else 'wood'),[(xa,ya,za),(xb,ya,zb),(xb,yb,zb),(xa,yb,za)],[(0,1,2,3)])
  beam((0,-1.5,4.25),(side*2.03,-1.5,3),.085,'lightwood')
 beam((0,-1.5,4.25),(0,2.03,4.25),.09,'wood')
 box((.9,.9,3.7),(.4,.42,.9),'cream');box((.9,.9,4.18),(.53,.53,.12),'stone')
 for dx in [-2.08,2.08]:
  for yy in [-2.45,-1.65,-.6,.5,1.6]:beam((dx,yy,.77),(dx,yy,1.48),.045,'wood')
  beam((dx,-2.5,1.5),(dx,1.9,1.5),.05,'lightwood')
 for j in range(4):box((-.7,-2.62-j*.31,.62-j*.16),(1.12,.34,.18),'wood')
 box((.4,-1.25,2.72),(1.25,.08,.34),'paper')
 plant(1.65,-1.85,.8,.23);lantern(-1.55,-1.55,.75)
 # Mailbox and resident sign are in-world semantic targets.
 beam((1.82,-2.75,.1),(1.82,-2.75,1.12),.07);box((1.82,-2.75,1.25),(.45,.35,.4),'roof');box((1.82,-2.94,1.25),(.3,.02,.04),'ink')

group('Landscape')
ball((0,0,-1.55),(23,20,1.6),'earth',64,10);ball((0,0,-.5),(22.7,19.7,.7),'grass',64,10)
for k in range(130):
 a=random.random()*math.tau;r=random.uniform(18,22);x=math.cos(a)*r;y=math.sin(a)*r*.85
 ball((x,y,.03),(.3,.4,.23),'stone',8,4)
for i in range(12):
 group('Landscape')
 a=i*math.tau/12;x=math.cos(a)*13;y=math.sin(a)*11
 path((x,y,0),(math.cos(a)*4.5,math.sin(a)*4.5,0))
 # Cabin front (-Y) faces the central commons.
 cabin(i,x,y,a-math.pi/2)
group('Landscape')
for i in range(30):
 a=i*2.399;r=random.uniform(16,20);tree(math.cos(a)*r,math.sin(a)*r*.83,random.uniform(4,6.7))
for k in range(450):
 x=random.uniform(-20,20);y=random.uniform(-17,17)
 if (x*x/400+y*y/289)>1 or math.hypot(x,y)<5:continue
 for j in range(3):leaf((x,y,.22),.12,j*2.4,'leaflight')
 if k%3==0:ball((x,y,.32),(.075,.075,.055),'flower' if k%2 else 'pink',6,3)
group('Commons')
beam((0,0,.12),(0,0,.28),4.9,'stone',n=64)
beam((0,0,.28),(0,0,.5),2.05,'wood',n=40)
for j in range(9):
 a=j*math.tau/9;box((math.cos(a)*3.9,math.sin(a)*3.9,.57),(1.3,.5,.16),'lightwood',a+math.pi/2)
 for k in [-.43,.43]:
  x=math.cos(a)*3.9-math.sin(a)*k;y=math.sin(a)*3.9+math.cos(a)*k;beam((x,y,.28),(x,y,.52),.065,'beam')
group('TogetherTree');tree(0,0,8.0)
for j in range(9):
 a=j*2.4;ball((math.cos(a)*1.9,math.sin(a)*1.9,2+j*.22),(.16,.16,.16),'energy')
group('WelcomeBoard',(-4,-4,0))
for x in [-.75,.75]:beam((x,0,0),(x,0,2),.1)
box((0,0,1.45),(1.95,.17,1.15),'wood');box((0,-.1,1.45),(1.75,.03,.95),'paper')
group('Pond',(-7,-13,.24));ball((0,0,.03),(3.7,2.35,.13),'water',48,6)
for k in range(28):
 a=k*math.tau/28;ball((math.cos(a)*3.65,math.sin(a)*2.3,.12),(.36,.29,.18),'stone')
for j in range(13):box((1.7,-2+j*.33,.48+math.sin(j*math.pi/12)*.22),(1.1,.3,.1),'wood')
for x in [1.14,2.26]:
 for y in [-2,0,2]:beam((x,y,.4),(x,y,1.25),.05)
 beam((x,-2,1.25),(x,2,1.25),.04)
for k in range(9):ball((random.uniform(-2,0),random.uniform(-1.5,1.5),.18),(.25,.2,.02),'leaf')
group('SpeciesGarden',(8,-13,0));tree(-1,0,3,'saxaul');tree(1,1,3.8)
for k in range(6):box((-2+k*.7,-1,.15),(.57,.57,.25),'stone');plant(-2+k*.7,-1,.3,.16)

# Shared choices become visible buildings after a co-signed delivery.
for kind,cx,cy in [('welcome',-6,0),('garden',6,0),('species',0,-7)]:
 for option in range(4):
  group('Project_%s_%d'%(kind,option),(cx+(option%2)*1.8-.9,cy+(option//2)*1.8-.9,.28))
  prop={'welcome':['board','route','bench','stage'],'garden':['bench','table','plants','stage'],'species':['board','table','window','stage']}[kind][option]
  if prop=='board':
   for x in [-.48,.48]:beam((x,0,0),(x,0,1.35),.065,'wood')
   box((0,0,1.15),(1.25,.12,.78),'wood');box((0,-.08,1.15),(1.06,.025,.6),'paper')
   for k in range(3):box((0,-.1,1.3-k*.14),(.75-k*.12,.015,.04),'roof')
  elif prop=='table':
   beam((0,0,.1),(0,0,.65),.12);beam((0,0,.65),(0,0,.76),.65,'lightwood',n=24)
   chair(-.8,0);chair(.8,0)
  elif prop=='plants':
   box((0,0,.22),(1.25,.85,.4),'wood');box((0,0,.44),(1.12,.72,.06),'earth')
   for x in [-.36,0,.36]:plant(x,0,.48,.18)
   box((0,-.62,.45),(1.45,.45,.14),'lightwood')
  elif prop=='bench':
   box((0,0,.55),(1.6,.6,.15),'lightwood');box((0,.25,.88),(1.6,.14,.55),'wood')
   for x in [-.6,.6]:beam((x,0,0),(x,0,.55),.08,'beam')
   plant(.95,.15,.1,.24)
  elif prop=='route':
   for k in range(7):ball(((-1)**k*.14,-.65+k*.21,.05),(.13,.18,.05),'stone',8,4)
   beam((.55,.5,0),(.55,.5,1.2),.045);box((.55,.5,1.07),(.68,.12,.25),'roof')
  elif prop=='window':
   for x in [-.6,.6]:beam((x,0,0),(x,0,1.65),.055,'wood')
   for z in [.8,1.6]:box((0,0,z),(1.3,.12,.13),'lightwood')
   for x in [-.75,-.45,.45,.75]:plant(x,.2,.1,.24)
  else:
   beam((0,0,0),(0,0,.25),.88,'wood',n=24)
   for x in [-.75,.75]:beam((x,.6,0),(x,.6,2),.055,'wood')
   beam((-.75,.6,1.95),(.75,.6,1.95),.035,'linen')
   for k in range(5):
    x=-.6+k*.3;mesh('terracotta' if k%2 else 'roof',[(x-.12,.6,1.93),(x+.12,.6,1.93),(x,.6,1.62)],[(0,1,2)])

# A fully modeled, roofless dollhouse interior, displayed separately in browser.
group('Interior')
for j in range(29):box((0,(j-14)*.2,.12),(6.5,.186,.24),'lightwood' if j%3 else 'wood')
box((0,2.85,1.7),(6.6,.17,3.35),'cream');box((-3.25,0,1.7),(.17,5.8,3.35),'cream')
for x in [-3.15,0,3.15]:box((x,2.7,1.75),(.16,.18,3.5),'wood')
box((0,2.72,3.25),(6.5,.18,.16),'wood')
box((1.1,2.7,2),(2.35,.12,1.8),'wood');box((1.1,2.61,2),(2.1,.06,1.55),'glow')
for x in [.12,1.1,2.08]:box((x,2.53,2),(.07,.06,1.7),'cream')
box((1.1,2.53,2),(2.1,.06,.07),'cream')
for x in [-.16,2.36]:
 for k in range(6):beam((x+k*.035,2.42,1.14),(x+k*.035,2.42,2.9),.044,'linen')
box((1.1,2.3,1.08),(2.7,.75,.16),'lightwood');plant(1.85,2.25,1.17,.2)
# archival cabinet and tactile folder
box((-2.35,1.5,.85),(1.25,.9,1.45),'wood')
for z in [.48,.93,1.38]:box((-2.35,1.02,z),(1.11,.06,.37),'lightwood');beam((-2.5,.96,z),(-2.2,.96,z),.025,'gold')
box((-2.32,1.5,1.65),(.82,.58,.12),'archive',.14);box((-2.32,1.47,1.72),(.56,.32,.012),'paper',.14)
beam((-2.33,1.2,1.75),(-2.33,1.78,1.75),.013,'cream');ball((-2.33,1.46,1.77),(.06,.06,.02),'gold')
# gathering table with two chairs and tea
beam((.65,.45,.25),(.65,.45,1.03),.2,'wood',.13);beam((.65,.45,1.03),(.65,.45,1.16),1.14,'lightwood',n=48)
for x in [.1,1.2]:beam((x,.4,1.17),(x,.4,1.31),.1,'cream',.11,18);beam((x,.4,1.31),(x,.4,1.32),.08,'bark',n=18)
box((.65,.9,1.18),(.62,.42,.025),'paper',.1)
chair(.65,1.8,.23);chair(.65,-1.0,.23)
ball((.4,.1,.265),(1.75,2,.025),'linen',48,4)
# sofa, books and plant niche
box((-2.25,-1.2,.56),(1.5,1.75,.46),'roof');box((-2.85,-1.2,.97),(.25,1.75,.75),'roof');box((-2.23,-1.2,.84),(1.05,1.48,.2),'linen')
box((-2.23,-1.82,.98),(1.1,.2,.47),'roof');plant(-2.5,2.4,.24,.32)
for j in range(7):box((-2.73+j*.13,2.1,1.94),(.1,.35,.5),'roof' if j%2 else 'terracotta')
box((-2.3,2.14,1.66),(1.45,.65,.12),'wood')
box((-1.2,-2.5,1.1),(.15,.15,1.75),'wood');box((-1.2,-2.5,1.75),(1.35,.15,.48),'paper')
box((2.6,-2.35,.48),(.8,.55,.65),'roof');box((2.6,-2.65,.56),(.55,.025,.06),'ink');box((2.6,-2.35,.84),(.94,.65,.12),'wood')
lantern(2.85,2.1,.2)

for (g,m),(vs,fs,smooth) in buckets.items():
 data=bpy.data.meshes.new(g+' '+m);data.from_pydata(vs,[],fs);data.update();o=bpy.data.objects.new(g+' '+m,data);bpy.context.collection.objects.link(o);o.parent=groups[g];o.data.materials.append(M[m])
 for p,s in zip(data.polygons,smooth):p.use_smooth=s
# Model visibility is handled by browser groups, not by destructive export removal.
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'opening-day.blend'))
bpy.ops.export_scene.gltf(filepath=os.path.join(WEB,'opening-day.glb'),export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
for child in groups['Interior'].children:child.hide_render=True
bpy.ops.object.camera_add(location=(32,-38,33));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,1))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=46;bpy.context.scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-10,-15,28));bpy.context.object.data.energy=2500;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=18
bpy.context.scene.world.use_nodes=True
bpy.context.scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.72,.81,.7,1)
bpy.context.scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.8
bpy.ops.object.light_add(type='SUN',location=(-10,-15,28));bpy.context.object.rotation_euler=(.45,-.5,-.4);bpy.context.object.data.energy=2;bpy.context.object.data.angle=.3
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=1400;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.filepath=os.path.join(OUT,'town-preview.png');bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,'opening-day.blend'));bpy.ops.render.render(write_still=True)
with open(os.path.join(OUT,'manifest.json'),'w') as f:json.dump({'groups':list(groups),'meshes':len(buckets),'vertices':sum(len(v[0]) for v in buckets.values()),'assets':'opening-day.glb','source':'opening-day.blend'},f,indent=2)
print('OPENING_DAY_EXPORTED',flush=True)
