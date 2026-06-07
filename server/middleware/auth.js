const jwt = require("jsonwebtoken");
const jwksRsa = require("jwks-rsa");

const jwks = jwksRsa({
  jwksUri: `${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxAge: 86400000,
});

function getKey(header, callback) {
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing auth token." });
  }
  const token = header.slice(7);
  jwt.verify(token, getKey, { algorithms: ["ES256", "RS256"] }, (err, payload) => {
    if (err) return res.status(401).json({ error: "Invalid or expired token." });
    req.user = { id: payload.sub };
    next();
  });
};
