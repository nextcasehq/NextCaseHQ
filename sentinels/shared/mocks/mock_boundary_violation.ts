import { crypto } from "../../../packages/crypto/src/envelope";

export const handleEnvelope = () => {
  // Direct relative import across monorepo packages, bypassing the workspace client exports
  return crypto;
};
