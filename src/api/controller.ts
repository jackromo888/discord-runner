import { Request, Response } from "express";
import { validationResult } from "express-validator";
import generateInvite from "./actions/generateInvite";
import isMember from "./actions/isMember";
import manageRoles from "./actions/manageRoles";
import { ManageRolesParams } from "./types/params";
import { ActionError } from "./types/results";

export default {
  upgrade: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: ManageRolesParams = req.body;
    manageRoles(params, true, res);
  },

  downgrade: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const params: ManageRolesParams = req.body;
    manageRoles(params, false, res);
  },

  getInvite: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId } = req.params;

    generateInvite(guildId).then((result) => {
      if (result instanceof ActionError) {
        res.status(400).send(result);
      } else {
        res.status(200).send(result);
      }
    });
  },

  isMember: (req: Request, res: Response): void => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { guildId, userId } = req.params;
    isMember(guildId, userId).then((result) => {
      if (result instanceof ActionError) {
        res.status(400).send(result);
      } else {
        res.status(200).send(result);
      }
    });
  },
};
