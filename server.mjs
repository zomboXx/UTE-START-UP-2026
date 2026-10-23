import http from 'node:http';
import planHandler from './api/plans.mjs';
import {readFile,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const directory=path.dirname(fileURLToPath(import.meta.url));
const root=path.join(directory,'dist');
const apk=process.env.BRAIN10_LOCAL_APK || path.resolve(directory,'../mobile/artifacts/brain10-android-debug.apk');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf','.txt':'text/plain; charset=utf-8'};
const port=Number(process.env.PORT || 4174);
const downloadable=async()=>{try{return (await stat(apk)).isFile();}catch{return false;}};
http.createServer(async(req,res)=>{
  try {
    if(['/api/plans','/v1/plans'].includes(new URL(req.url,'http://localhost').pathname)){await planHandler(req,res);return;}
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
    const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(url==='/release.json'){
      const release=JSON.parse(await readFile(path.join(root,'release.json'),'utf8'));
      if(await downloadable()){release.localPreview=true;release.downloadUrl='/downloads/brain10-android-debug.apk';release.bytes=(await stat(apk)).size;}
      res.writeHead(200,{'Content-Type':types['.json'],'Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:JSON.stringify(release));return;
    }
    if(url==='/downloads/brain10-android-debug.apk'&&await downloadable()){
      res.writeHead(200,{'Content-Type':'application/vnd.android.package-archive','Content-Disposition':'attachment; filename="brain10-android-debug.apk"','Content-Length':(await stat(apk)).size,'Cache-Control':'no-store'});
      if(req.method==='HEAD')res.end();else{const stream=createReadStream(apk);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}return;
    }
    const page=url==='/'?'/index.html':url==='/try'||url==='/try/'?'/try/index.html':url;
    const target=path.resolve(root,'.'+page);
    if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    const body=await readFile(target);res.writeHead(200,{'Content-Type':types[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
  } catch {res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('Không tìm thấy trang.');}
}).listen(port,'127.0.0.1',()=>console.log(`Brain10 website: http://127.0.0.1:${port}`));
