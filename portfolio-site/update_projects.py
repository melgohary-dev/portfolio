path='index.html'
s=open(path,encoding='utf-8').read()
# replace company projects section content
old = '''      <div class=\"cp-group\" data-reveal><h3>Qumra / Majarah (now Qumra)</h3><ul><li>Offline-first POS, @qumra/pos-core, Electron, multi-tab sync, outbox queue</li><li>Adum Car, Sunivage, Pyramids, Best Cleaner</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Lumofy</h3><ul><li>LXP modules and drag-and-drop builders</li><li>AI-powered recommendations and competency analysis</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Dexef</h3><ul><li>ERP financial modules and Page Builder</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Rowaad</h3><ul><li>Mezan, New Vision Center, All Size, Oshna + dashboards; Khedma</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>New Concept</h3><ul><li>Educational platform, dashboards, company site</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Dipdux Analytica</h3><ul><li>Dashboard, projects, Mentorna</li></ul></div>'''
new = '''      <div class=\"cp-group\" data-reveal><h3>Qumra / Majarah (now Qumra)</h3><ul><li>Offline-first POS (@qumra/pos-core, SQLite, Electron, multi-tab sync, outbox queue)</li><li>Adum Car \u2013 frontend + backend/dashboard (Remix Run)</li><li>Sunivage \u2013 backend/dashboard (Remix Run)</li><li>Pyramids \u2013 backend/dashboard (Remix Run)</li><li>Best Cleaner \u2013 backend/dashboard (Remix Run)</li><li>OPEC Institutes Alex \u2013 dashboard + backend (MERN/Next)</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Lumofy</h3><ul><li>Lumofy LXP \u2013 Learning Pathways, Content, Appraisals, Competencies, 360 Reviews, Performance Cycles, Reels, Assessments, Quizzes, Sessions</li><li>Drag-and-drop builders: Courses, Content, Certificate Templates</li><li>AI-powered content recommendations and competency analysis</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Dexef</h3><ul><li>Unified ERP Suite \u2013 financial modules, inventory, restaurants, hotels, airports</li><li>Drag-and-drop Page Builder with custom widget actions</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Rowaad</h3><ul><li>Mezan \u2013 legal consultation + admin dashboard</li><li>New Vision Center \u2013 health training + admin dashboard</li><li>All Size \u2013 e-commerce + admin dashboard</li><li>Oshna \u2013 real estate + admin dashboard</li><li>Khedma \u2013 online freelancers marketplace</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>New Concept</h3><ul><li>Educational Engagement Platform (React\u2192Next.js)</li><li>New Concept Dashboard</li><li>New Concept Website</li><li>Homzmart Dashboard</li><li>Teacher features & dashboards</li></ul></div>
      <div class=\"cp-group\" data-reveal><h3>Dipdux Analytica</h3><ul><li>Company dashboard</li><li>Mentorna \u2013 mentorship platform</li><li>Multiple frontend projects (Balady Market, Maintenance7 Center, Coming Soon, Starbucks clone, etc.)</li><li>Freelance/utility apps (Task Manager, Pomodoro, TypeScript Quiz, Encoder, Todo)</li></ul></div>'''
if old not in s:
    print('not found')
else:
    s=s.replace(old,new,1)
    open(path,'w',encoding='utf-8').write(s)
    print('ok')