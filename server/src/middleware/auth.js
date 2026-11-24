import jwt from 'jsonwebtoken';
import {db} from '../config/database.js';

export function auth(req,res,next){
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer /,'');
    if(!token)throw Error();
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const user=db.prepare('SELECT user_id,name,email,role,department_id,is_active FROM users WHERE user_id=?').get(payload.user_id);
    if(!user||!user.is_active)return res.status(401).json({error:'Your account is inactive or no longer exists'});
    req.user=user;
    next();
  }catch{
    res.status(401).json({error:'Please sign in to continue'});
  }
}
export function allow(...roles){
  return(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'You do not have permission to perform this action'});
}
