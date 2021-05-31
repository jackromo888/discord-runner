import { Request, Response } from "express";
import { validationResult } from "express-validator";
import addRole from "./actions/addRole";
import { UpgradeParams } from "./params";

export default {
  upgrade: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: UpgradeParams = req.body;
    addRole(params, res);
  },
};
