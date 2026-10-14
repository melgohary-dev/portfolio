path='index.html'
s=open(path,encoding='utf-8').read()
mod=['Remix Run','jQuery','PHP','React Native','Python Basics','Python (Django basics)','C# (.NET integration)','Visual Basic','Native PHP','CPanel Administration','Deploying Apps','Deploying React Apps and Node.js Apps','SEO Basics','SEO','Bootstrap','C# (.NET)','WebUSB']
for t in mod:
    s=s.replace('<span class=\"skill-badge skill-proficient\">'+t+'</span>', '<span class=\"skill-badge skill-moderate\">'+t+'</span>')
open(path,'w',encoding='utf-8').write(s)
print('ok')