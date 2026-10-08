"""Blender-authored private wing; native meshes, separately named interactive props."""
import bpy, ast, math, random, json
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[2]
WEB=Path(__file__).resolve().parents[1]/'assets'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
M={};groups={};buckets={};G='StudyShell'
source=(BASE/'source'/'build_opening_day.py').read_text()
for node in ast.parse(source).body:
 if isinstance(node,ast.FunctionDef):exec(compile(ast.get_source_segment(source,node),'legacy-geometry','exec'))
for n,c in [('wood','D7AF78'),('lightwood','EACDA2'),('beam','AF8156'),('cream','F3E4C9'),('roof','829475'),('terracotta','C78160'),('rooflight','A2B292'),('leaf','57814C'),('leaflight','9DBF73'),('leafdark','416B45'),('stone','E2D3B7'),('water','83BEB6'),('ink','355447'),('paper','F9EED7'),('gold','DDB565'),('flower','F0C984'),('pink','DC9B99'),('linen','E5D8B7'),('archive','C59868')]:mat(n,c)
mat('morning','FFE2A5',.5,.35);mat('work','ACD5D6',.5,.2);mat('pressure','9FAEC2',.6,.1);mat('glow','FFE7B7',.5,.7)
group('StudyShell')
for j in range(34):box((7.5,(j-16.5)*.21,.18),(7,.198,.25),'lightwood' if j%4 else 'wood')
box((7.5,3.48,1.85),(7,.16,3.45),'cream')
for x in [4,6.3,8.6,11]:box((x,3.35,1.85),(.15,.15,3.6),'wood')
box((7.5,3.3,3.58),(7.1,.22,.24),'wood')
for j in range(14):box((7.5,3.37,.35+j*.2),(6.8,.035,.015),'lightwood')
group('PrivateGate')
for y in [-2.2,2.2]:
 for yy in [-.6,.6]:beam((4,y+yy,.3),(4,y+yy,2.8),.055,'wood')
 box((4,y,1.6),(.09,1.2,2.1),'linen')
beam((4,-.9,.3),(4,-.9,2.1),.06,'wood');box((4,-.9,2.05),(.12,.85,.35),'paper')
for i,(x,material) in enumerate([(5.25,'morning'),(7.5,'work'),(9.75,'pressure')]):
 group('StateWindow_'+str(i),(x,3.05,2.45));box((0,0,0),(1.65,.18,1.6),'wood');box((0,-.11,0),(1.43,.05,1.38),material)
 for dx in [-.65,0,.65]:box((dx,-.15,0),(.055,.04,1.42),'cream')
 box((0,-.15,-.15),(1.43,.04,.055),'cream');box((0,-.15,-.87),(1.9,.36,.12),'lightwood')
 # Miniature landscape relief inside each window, not a flat image placeholder.
 for j in range(3):
  xj=-.5+j*.47
  if i==1:
   box((xj,-.19,-.42+j*.04),(.32,.05,.5+j*.08),'terracotta' if j==1 else 'cream');box((xj,-.23,-.13+j*.08),(.4,.05,.09),'roof');box((xj,-.24,-.37),(.09,.015,.12),'gold')
  else:
   beam((xj,-.19,-.65),(xj,-.19,-.13+j*.08),.025,'wood');ball((xj,-.21,-.1+j*.08),(.18,.025,.3),'leaf' if i!=2 else 'roof',12,6)
 if i==2:
  for j in range(3):ball((-.22+j*.21,-.23,.43),(.24,.025,.12),'stone',12,6)
  for j in range(5):beam((-.55+j*.25,-.24,.19),(-.62+j*.25,-.24,-.03),.013,'work')
 ball((.43,-.2,.42),(.17,.025,.17),'morning' if i==0 else 'paper',16,8)
group('BehaviorShelf',(5.5,2.55,0));box((0,0,1.35),(2.4,.7,2.1),'wood')
for z in [.45,1.05,1.65,2.25]:box((0,-.13,z),(2.36,.84,.095),'lightwood')
for i in range(16):
 row=i//4;column=i%4;kind='pressure' if i in [11,15] else 'shadow' if i in [3,7,14] else 'secondary' if i in [2,6,10,13] else 'core'
 group('BehaviorBook_'+str(i),(4.63+column*.58,2.15,.74+row*.6))
 box((0,0,0),(.38,.22,.43),['terracotta','gold','roof','water'][i//4]);box((0,-.126,0),(.25,.012,.22),'paper');box((0,-.14,-.13),(.29,.012,.025),'gold')
 if kind=='shadow':groups['BehaviorBook_'+str(i)].rotation_euler.y=.38
 if kind=='pressure':box((0,-.16,0),(.47,.026,.49),'water');ball((0,-.2,-.1),(.045,.035,.06),'gold')
group('FireplaceMirror',(9.65,2.05,0));box((0,0,.85),(1.9,.75,1.3),'stone');box((0,-.4,.75),(1.23,.04,.82),'ink');box((0,0,1.56),(2.1,.95,.15),'wood')
for j in range(3):beam((-.4+j*.34,-.4,.46),(-.22+j*.34,-.38,.51),.1,'wood');ball((-.35+j*.3,-.44,.7),(.15,.04,.28),'terracotta')
ball((0,-.05,2.35),(.72,.12,.83),'gold',32,12);ball((0,-.2,2.35),(.62,.03,.71),'water',32,12)
for x in [-.8,.8]:lantern(x,0,1.63)
group('ReportFolio',(10.3,-1.65,0));box((0,0,.85),(.8,.65,.13),'wood');beam((0,0,.3),(0,0,.85),.09,'wood');box((0,0,.98),(.68,.5,.09),'archive');box((0,-.1,1.03),(.5,.23,.03),'paper');box((0,-.1,1.06),(.08,.15,.01),'gold')
group('LabBench',(7.1,-1.95,0));box((0,0,1.1),(2.8,1.3,.15),'lightwood')
for x in [-1.2,1.2]:
 for y in [-.45,.45]:beam((x,y,.3),(x,y,1.07),.065,'wood')
for i,x in enumerate([-.68,.15]):
 group('Reagent_'+str(i),(7.1+x,-1.95,1.2));ball((0,0,.32),(.23,.23,.3),'water' if i==0 else 'terracotta',24,12);beam((0,0,.48),(0,0,.72),.08,'paper',n=18);beam((0,0,.71),(0,0,.8),.09,'wood',n=18)
group('ReactionDish',(7.92,-1.95,1.2));ball((0,0,.03),(.44,.38,.08),'cream',24,8);ball((0,0,.085),(.32,.28,.018),'water',24,8)
group('ReactionBubbles',(7.92,-1.95,1.32))
for i in range(7):ball((math.sin(i*2.4)*.25,math.cos(i*2.4)*.23,.1+i*.11),(.07,.07,.07),'gold',12,6)
for i,x in enumerate([6.42,7.25]):
 group('ReactionFlow_'+str(i));beam((x,-1.95,1.65),(7.92,-1.95,1.3),.022,'water' if i==0 else 'terracotta')
group('ShareExit',(4.9,-2.8,0));beam((0,0,.3),(0,0,1.3),.06,'wood');box((0,0,1.35),(1.3,.1,.55),'paper');box((0,-.06,1.35),(.65,.012,.04),'gold')
group('DoorInside',(4.3,.95,0));beam((0,0,.3),(0,0,1.6),.05,'wood');box((0,0,1.72),(.13,.85,.58),'paper');box((.075,0,1.75),(.018,.53,.055),'gold')
for i,(x,y,material) in enumerate([(5,1.2,'morning'),(4.7,-1.5,'gold'),(7.5,.7,'paper'),(9.5,1.1,'terracotta')]):
 group('LightPool_'+str(i),(x,y,.3));beam((0,0,0),(0,0,.018),.68,material,n=48)
group('LightRecipe',(8.5,.55,0));beam((0,0,.3),(0,0,.94),.09,'wood');beam((0,0,.94),(0,0,1.03),.52,'wood',n=32);box((0,0,1.07),(.72,.5,.04),'paper')
for x,y in [(4.5,2.9),(10.5,2.9),(10.4,-2.5)]:
 group('StudyPlant_'+str(x));plant(x,y,.28,.3)
# Exterior vocabulary instances. Each influence keeps its own semantic identity.
for dim,x in [('D',-2.1),('I',-.7),('S',.7),('C',2.1)]:
 group('Style_'+dim,(x,-2.1,0))
 if dim=='D':
  for xx in [-.25,.25]:beam((xx,0,.3),(xx,0,2.25),.045,'wood')
  box((0,0,2.27),(.7,.65,.1),'lightwood');beam((0,0,2.35),(.5,0,2.4),.07,'ink')
 elif dim=='I':
  beam((0,0,.3),(0,0,.75),.065,'wood');beam((0,0,.75),(0,0,.84),.45,'lightwood',n=24);beam((0,0,.86),(0,0,1.55),.03,'wood');beam((0,0,1.55),(0,0,1.76),.63,'terracotta',.01,n=24)
 elif dim=='S':plant(-.2,0,.3,.25);box((.2,0,.6),(.6,.5,.4),'roof')
 else:
  box((0,0,.88),(.82,.5,.09),'wood')
  for xx in [-.32,.32]:beam((xx,0,.3),(xx,0,.85),.05,'wood')
  box((0,0,.97),(.34,.22,.1),'paper');ball((.26,0,1.04),(.11,.11,.11),'gold')
root=bpy.data.objects.new('CognitionRoom',None);bpy.context.collection.objects.link(root)
styles=bpy.data.objects.new('StyleTemplates',None);bpy.context.collection.objects.link(styles)
for name,obj in groups.items():obj.parent=styles if name.startswith('Style_') else root
for (g,m),(vs,fs,smooth) in buckets.items():
 meshdata=bpy.data.meshes.new(g+'_'+m);meshdata.from_pydata(vs,[],fs);meshdata.update();obj=bpy.data.objects.new(g+'_'+m,meshdata);bpy.context.collection.objects.link(obj);obj.parent=groups[g];obj.data.materials.append(M[m])
 for face,s in zip(meshdata.polygons,smooth):face.use_smooth=s
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).resolve().parent/'cognition.blend'))
bpy.ops.export_scene.gltf(filepath=str(WEB/'cognition.glb'),export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
(WEB/'cognition-manifest.json').write_text(json.dumps({'source':'cognition.blend','groups':list(groups),'books':16,'windows':3,'lights':4},indent=2))
print('COGNITION_EXPORT_COMPLETE',flush=True)
