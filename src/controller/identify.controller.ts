import { Request, Response } from 'express';
import { identifyContact } from '../service/identify.service';

export const identify = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber } = req.body;
    const contact = await identifyContact(email, phoneNumber);
    res.status(200).json({ contact });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
