"""Blender-authored woodland demo. Reuses geometry vocabulary, never old export code."""
import ast, bpy, math, random, os, json
from pathlib import Path
from mathutils import Vector
BASE=Path(__file__).resolve().parents[2]
OUT=BASE.parent/'ant-town-visuals'/'forest'
WEB=Path(__file__).resolve().parents[1]/'assets'
OUT.mkdir(parents=True,exist_ok=True); WEB.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
M={};groups={};buckets={};G='Village';random.seed(927)
source=(BASE/'source'/'build_opening_day.py').read_text()
module=ast.parse(source)
for node in module.body:
 if isinstance(node,ast.FunctionDef):
  snippet=ast.get_source_segment(source,node).replace('range(380)','range(75)')
  exec(compile(snippet,'legacy-geometry','exec'))
for n,c in [('wood','D7AF78'),('lightwood','EACDA2'),('beam','AF8156'),('cream','F3E4C9'),('roof','829475'),('terracotta','C78160'),('rooflight','A2B292'),('bark','9E7650'),('grass','93AD79'),('moss','729357'),('leaf','57814C'),('leaflight','9DBF73'),('leafdark','416B45'),('stone','E2D3B7'),('earth','B19B70'),('water','83BEB6'),('ink','355447'),('paper','F9EED7'),('gold','DDB565'),('flower','F0C984'),('pink','DC9B99'),('linen','E5D8B7'),('archive','C59868'),('skin','DDB794'),('hair','634F42'),('outfit','738D7A')]:mat(n,c)
mat('glow','FFE7B7',.6,.5);mat('energy','C4E59E',.4,.3)
group('Terrain');ball((0,0,-1.1),(25,22,1.4),'earth',64,8);ball((0,0,-.42),(24.8,21.8,.68),'grass',64,8)
for x,y in [(-9,6),(0,10),(9,6),(-11,-5),(0,-10),(11,-5)]:path((x,y,0),(0,0,0),1.4)
homes=[(-9,6),(0,10),(9,6),(-11,-5),(0,-10),(11,-5)]
for i,(x,y) in enumerate(homes):cabin(i,x,y,0)
group('Plants')
for i in range(42):
 a=i*2.399;r=random.uniform(19,23);tree(math.cos(a)*r,math.sin(a)*r*.85,random.uniform(3.2,6))
for i in range(170):
 a=random.random()*math.tau;r=random.uniform(4,22);x=math.cos(a)*r;y=math.sin(a)*r*.86
 if any(math.hypot(x-hx,y-hy)<3.6 for hx,hy in homes):continue
 for j in range(3):leaf((x,y,.3),.22,j*2.4,'leaflight')
 if i%2==0:ball((x,y,.47),(.1,.1,.1),'flower' if i%3 else 'pink',8,4)
group('Plaza');beam((0,0,.2),(0,0,.32),4.1,'stone',n=64)
group('TogetherTree',(0,1,.25));tree(0,0,4)
for i in range(3):
 group('Orb_'+str(i),(math.cos(i*2.1)*1.7,1+math.sin(i*2.1)*1.3,2.2+i*.3));ball((0,0,0),(.23,.23,.23),'energy',16,8)
spots={'park':(-6,0),'library':(-15,6),'growth':(15,7),'play':(8,-13),'class':(-9,-13),'workshop':(0,17),'shop':(6,0)}
for key,(x,y) in spots.items():
 group('Place_'+key,(x,y,.25));beam((0,0,0),(0,0,.16),2.4,'stone',n=32)
 for bx in [-1.7,1.7]:beam((bx,1,0),(bx,1,2.8),.12,'wood')
 box((0,1,2.8),(3.8,.25,.22),'lightwood');box((0,1,2.4),(2,.15,.55),'paper')
 if key=='library':
  box((0,.8,1.2),(2.8,.8,2.1),'wood')
  for z in [.5,1.15,1.8]:
   box((0,.3,z),(2.8,.75,.1),'lightwood')
   for j in range(12):box((-1.15+j*.2,.37,z+.26),(.15,.4,.45),'roof' if j%2 else 'terracotta')
 elif key=='growth':
  for j in range(3):plant(-1+j,-.4,.1,.35+j*.1)
  beam((.1,.1,0),(.1,.1,1.3),.07);leaf((.1,.1,1.1),.45,.5,'leaf')
 elif key=='play':
  for j in range(9):plant((j%3-1)*.8,(j//3-1)*.6,.12,.22)
 elif key in ['class','workshop','park']:
  box((0,.4,1.35),(2.7,.16,1.7),'roof');box((0,.29,1.35),(2.45,.04,1.42),'paper')
  for bx in [-1,1]:chair(bx,-1,.12)
 else:
  box((0,0,.9),(3,1.2,.2),'lightwood')
  for bx in [-1,0,1]:box((bx,0,1.22),(.55,.55,.45),'terracotta' if bx else 'roof');box((bx,0,1.47),(.6,.6,.05),'paper')
 group('Paths_'+key);path((x,y,0),(x*.75,y*.75,0))
# A richer cutaway cabin; semantic props remain separate for interaction and personalization.
group('HomeShell')
for j in range(34):box((0,(j-16.5)*.21,.18),(8,.198,.25),'lightwood' if j%4 else 'wood')
box((0,3.48,1.85),(8,.16,3.45),'cream');box((-3.95,0,1.85),(.16,7,3.45),'cream')
for x in [-3.86,-1.3,1.3,3.86]:box((x,3.35,1.9),(.16,.16,3.6),'wood')
box((0,3.3,3.58),(8,.22,.24),'wood')
for y in [-3.3,0,3.3]:box((-3.82,y,1.85),(.16,.16,3.5),'wood')
for j in range(15):box((0,3.37,.35+j*.2),(7.8,.04,.015),'lightwood')
box((1.65,3.3,2.05),(2.45,.2,1.85),'wood');box((1.65,3.17,2.05),(2.22,.08,1.62),'glow')
for x in [.55,1.65,2.75]:box((x,3.1,2.05),(.075,.06,1.7),'cream')
box((1.65,3.1,2.05),(2.3,.06,.08),'cream');box((1.65,2.95,1.12),(2.7,.75,.15),'wood')
for x in [.29,2.96]:
 for j in range(6):beam((x+j*.042,3,1.18),(x+j*.042,3,3),.04,'linen')
plant(2.25,2.83,1.23,.26);lantern(3.35,2.8,.3)
group('Sofa');box((-2.9,-.4,.55),(1.35,2.25,.45),'roof');box((-3.45,-.4,1.02),(.25,2.25,.88),'roof')
for y in [-1.35,.55]:box((-2.85,y,.97),(1.3,.25,.75),'roof')
box((-2.75,-.4,.84),(1.13,1.8,.24),'linen');box((-3.02,.2,1.1),(.25,.64,.57),'terracotta',.1)
group('Rug');ball((.1,0,.33),(2.4,2.1,.035),'linen',48,4)
group('Table',(.5,.3,0));beam((0,0,.3),(0,0,1.12),.18,'wood');beam((0,0,1.12),(0,0,1.25),1.18,'lightwood',n=48)
for x in [-.65,.65]:beam((x,.2,1.25),(x,.2,1.41),.115,'cream',.12,18)
chair(.3,1.82,.3);chair(.3,-1.35,.3)
group('Book',(.42,.0,1.28));box((0,0,0),(.93,.65,.07),'roof',-.08);box((0,0,.06),(.86,.59,.07),'paper',-.08);box((0,0,.1),(.025,.57,.012),'gold',-.08)
group('Shelf',(-2.4,2.8,0));box((0,0,1.2),(1.7,.85,1.8),'wood')
for z in [.55,1.2,1.9]:
 box((0,-.1,z),(1.65,1,.1),'lightwood')
 for j in range(8):box((-.65+j*.18,-.1,z+.25),(.13,.5,.43),'roof' if j%2 else 'terracotta')
group('Camera',(-2.5,2.63,2.08));box((0,0,.16),(.65,.3,.35),'ink');beam((0,-.16,.17),(0,-.33,.17),.15,'gold',n=20);beam((0,-.34,.17),(0,-.36,.17),.12,'ink',n=20);box((.18,0,.37),(.15,.12,.05),'gold')
group('Wish',(3,1.35,0));box((0,0,.75),(1,.75,.14),'wood');beam((0,0,.3),(0,0,.7),.12,'wood');ball((0,0,1.1),(.25,.25,.35),'water',24,12);beam((0,0,1.32),(0,0,1.52),.11,'water',n=20);beam((0,0,1.51),(0,0,1.56),.12,'wood');box((0,-.23,1.12),(.24,.035,.21),'paper',.1)
group('Doorplate',(-1,-3.15,0));beam((0,0,.2),(0,0,1.45),.07);box((0,0,1.52),(1.5,.15,.5),'paper')
group('Mailbox',(3,-2.9,0));beam((0,0,.3),(0,0,1),.1);box((0,0,1.12),(.75,.5,.5),'roof');box((0,-.26,1.1),(.5,.025,.06),'ink');box((0,0,1.41),(.85,.6,.09),'wood')
group('PlantDecor');plant(-3,-2.6,.3,.43);plant(-3.35,1.5,.3,.32)
group('FlowerDecor');plant(3.45,-.6,.3,.4)
group('GiftDecor');box((2.8,-2.1,.5),(.65,.6,.4),'terracotta');box((2.8,-2.1,.72),(.7,.65,.06),'paper');box((2.8,-2.1,.77),(.12,.67,.04),'gold')
# Avatar with separate limbs for real walking animation.
for name in ['Torso','Head','ArmL','ArmR','LegL','LegR']:
 group('Avatar_'+name)
 if name=='Torso':ball((0,0,.89),(.25,.17,.33),'outfit',20,10)
 elif name=='Head':
  ball((0,0,1.4),(.27,.245,.3),'skin',24,12);ball((0,.03,1.56),(.28,.235,.2),'hair',24,10)
  for x in [-.09,.09]:ball((x,-.225,1.42),(.025,.024,.035),'ink',10,6)
 elif name.startswith('Arm'):
  x=-.28 if name.endswith('L') else .28;groups['Avatar_'+name].location=(x,0,1.1);beam((0,0,0),(0,0,-.35),.075,'outfit');ball((0,0,-.4),(.075,.075,.09),'skin')
 else:
  x=-.12 if name.endswith('L') else .12;groups['Avatar_'+name].location=(x,0,.67);beam((0,0,0),(0,0,-.36),.09,'ink');ball((0,-.06,-.44),(.12,.2,.085),'cream')
roots={}
for name in ['Village','Home','Avatar']:
 roots[name]=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(roots[name])
home_names={'HomeShell','Sofa','Rug','Table','Book','Shelf','Camera','Wish','Doorplate','Mailbox','PlantDecor','FlowerDecor','GiftDecor'}
for g,obj in groups.items():obj.parent=roots['Avatar' if g.startswith('Avatar_') else 'Home' if g in home_names else 'Village']
for (g,m),(vs,fs,smooth) in buckets.items():
 meshdata=bpy.data.meshes.new(g+'_'+m);meshdata.from_pydata(vs,[],fs);meshdata.update();obj=bpy.data.objects.new(g+'_'+m,meshdata);bpy.context.collection.objects.link(obj);obj.parent=groups[g];obj.data.materials.append(M[m])
 for face,s in zip(meshdata.polygons,smooth):face.use_smooth=s
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'forest.blend'))
bpy.ops.export_scene.gltf(filepath=str(WEB/'forest.glb'),export_format='GLB',export_apply=True,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
(WEB/'manifest.json').write_text(json.dumps({'source':'forest.blend','homes':homes,'places':spots,'groups':list(groups),'vertices':sum(len(v[0]) for v in buckets.values())},indent=2))
print('FOREST_EXPORT_COMPLETE',flush=True)
