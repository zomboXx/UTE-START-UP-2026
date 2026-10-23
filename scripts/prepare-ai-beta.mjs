import {writeFile,mkdir} from 'node:fs/promises';
import {betaAccessCode} from '../api/plans.mjs';
const key=process.env.POOL_API_KEY;
if(!key)throw new Error('POOL_API_KEY is missing in the server process environment.');
const directory=new URL('../../mobile/.android-dev/',import.meta.url);
await mkdir(directory,{recursive:true});
await writeFile(new URL('ai-beta-access.txt',directory),betaAccessCode(key)+'\n',{mode:0o600});
console.log('Private beta access file prepared in apps/mobile/.android-dev/ai-beta-access.txt. Value hidden.');
