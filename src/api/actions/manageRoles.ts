import { Collection, Role } from "discord.js";
import { Response } from "express";
import Main from "../../Main";
import logger from "../../utils/logger";
import { ManageRolesParams } from "../types/params";
import getUserResult from "../utils/getUserResult";

export default function manageRoles(
  params: ManageRolesParams,
  isUpgrade: boolean,
  res: Response
): void {
  Main.Client.guilds
    .fetch(params.guildId)
    .then((guild) => {
      guild.members
        .fetch({ user: params.userId })
        .then((member) => {
          guild.roles
            .fetch()
            .then((roles) => {
              const rolesToAdd: Collection<string, Role> = roles.cache.filter(
                (role) => params.roleIds.includes(role.id)
              );
              if (rolesToAdd.size !== params.roleIds.length) {
                const missingRoleIds = params.roleIds.filter(
                  (roleId) =>
                    !rolesToAdd.map((role) => role.id).includes(roleId)
                );
                const errorMsg = `missing role(s): ${missingRoleIds}`;
                res.status(400).json({
                  error: errorMsg,
                });
              } else {
                if (isUpgrade) {
                  member.roles
                    .add(rolesToAdd)
                    .then((updatedMember) => {
                      res.status(200).json(getUserResult(updatedMember));
                    })
                    .catch((error) => {
                      logger.error(error);
                      const errorMsg = "cannot add role(s) to user";
                      res.status(400).json({
                        error: errorMsg,
                      });
                    });
                } else {
                  member.roles
                    .remove(rolesToAdd)
                    .then((updatedMember) => {
                      res.status(200).json(getUserResult(updatedMember));
                    })
                    .catch((error) => {
                      logger.error(error);
                      const errorMsg = "cannot remove role(s) from user";
                      res.status(400).json({
                        error: errorMsg,
                      });
                    });
                }
                member.send(params.message).catch(logger.error);
              }
            })
            .catch((error) => {
              logger.error(error);
              const errorMsg = "cannot fetch roles";
              res.status(400).json({
                error: errorMsg,
              });
            });
        })
        .catch((error) => {
          logger.error(error);
          const errorMsg = "user not found";
          res.status(400).json({
            error: errorMsg,
          });
        });
    })
    .catch((error) => {
      logger.error(error);
      const errorMsg = "guild not found";
      res.status(400).json({
        error: errorMsg,
      });
    });
}
