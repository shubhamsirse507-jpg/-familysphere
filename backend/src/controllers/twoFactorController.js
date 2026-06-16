import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { User } from '../models/index.js';

export const setup2FA = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const secret = speakeasy.generateSecret({
      name: `FamilySphere (${user.email})`
    });

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({ error: 'Failed to generate 2FA secret' });
  }
};

export const verify2FA = async (req, res) => {
  try {
    const { code, secret } = req.body;
    if (!code || !secret) {
      return res.status(400).json({ error: 'Verification code and secret are required' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: code,
      window: 1 // 1 step tolerance (30 seconds before/after)
    });

    if (!verified) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    user.twoFactorSecret = secret;
    await user.save();

    res.json({ success: true, message: '2FA enabled successfully' });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA code' });
  }
};

export const disable2FA = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.twoFactorSecret = null;
    await user.save();

    res.json({ success: true, message: '2FA disabled successfully' });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
};
