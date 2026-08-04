import jwt from "jsonwebtoken";

/**
 * Signs a JWT for the given user id and sets it as an httpOnly cookie
 * on the response. Using httpOnly (rather than storing the token in
 * localStorage) protects against XSS-based token theft.
 */
export const generateToken = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  });

  return token;
};
