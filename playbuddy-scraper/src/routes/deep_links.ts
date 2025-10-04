import { Router, Request, Response } from "express";
import { createBranchLink } from "../modules/branch/createBranchLink";

export const router = Router();

router.post('branch/link', async (req: Request, res: Response) => {
    const linkText = await createBranchLink({
        title: req.body.title,
        socialTitle: req.body.socialTitle,
        socialDescription: req.body.socialDescription,
    });
    res.json({ linkText });
});