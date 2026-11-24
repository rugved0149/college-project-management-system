const API=import.meta.env.VITE_API_URL||'http://localhost:5000/api';

export async function api(path, options={}) {
  const token=localStorage.getItem('cf_token');
  const isForm=typeof FormData!=='undefined' && options.body instanceof FormData;
  const headers={...(token?{Authorization:'Bearer '+token}:{}),...options.headers};
  if(!isForm && options.body && !headers['Content-Type']) headers['Content-Type']='application/json';
  const response=await fetch(API+path,{...options,headers});
  const data=await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error||data.message||'Request failed');
  return data;
}

export async function download(path, filename) {
  const token=localStorage.getItem('cf_token');
  const response=await fetch(API+path,{headers:token?{Authorization:'Bearer '+token}:{}});
  if(!response.ok) {
    const data=await response.json().catch(()=>({}));
    throw new Error(data.error||'Download failed');
  }
  const blob=await response.blob();
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url; link.download=filename||'download';
  document.body.appendChild(link); link.click(); link.remove();
  URL.revokeObjectURL(url);
}
