import jwt from 'jsonwebtoken';
export function auth(req,res,next){try{const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!token)throw Error();req.user=jwt.verify(token,process.env.JWT_SECRET);next()}catch{res.status(401).json({error:'Please sign in to continue'})}}
export function allow(...roles){return(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'You do not have permission to perform this action'})}
