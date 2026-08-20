const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const {figures}=require('./figures');
const dir=path.join(__dirname,'figs'); fs.rmSync(dir,{recursive:true,force:true}); fs.mkdirSync(dir,{recursive:true});
const names=Object.keys(figures);
for(const n of names) fs.writeFileSync(path.join(dir,n+'.svg'),figures[n]);
execFileSync('soffice',['--headless','--norestore','--nologo','--convert-to','png','--outdir',dir,...names.map(n=>path.join(dir,n+'.svg'))],{stdio:'ignore',timeout:300000});
for(const n of names){const f=path.join(dir,n+'.png');console.log(n, fs.existsSync(f)?fs.statSync(f).size+' bytes':'MISSING');}
