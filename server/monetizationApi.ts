import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { getStorageAdapter, VersionInfo } from './storage';

// Validation Schema
const AdFrequencySchema = z.object({
  maxImpressions: z.number().min(1).optional(),
  timeframeSeconds: z.number().min(1).optional(),
});

const AdTriggerSchema = z.object({
  type: z.enum(['load', 'click', 'scroll', 'exitIntent', 'firstVisit']),
  value: z.union([z.string(), z.number()]).optional(),
});

const AdConfigSchema = z.object({
  id: z.string(),
  type: z.string(),
  enabled: z.boolean(),
  priority: z.number().optional(),
  desktop: z.boolean(),
  mobile: z.boolean(),
  countries: z.array(z.string()).optional(),
  frequency: AdFrequencySchema.optional(),
  trigger: AdTriggerSchema.optional(),
  delay: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  url: z.string().optional(),
  customScript: z.string().optional(),
  customHTML: z.string().optional(),
  options: z.record(z.string(), z.any()).optional(),
});

const AdManagerConfigSchema = z.object({
  globalEnabled: z.boolean(),
  ads: z.array(AdConfigSchema),
});

const getHash = (data: any) => crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');

const storage = getStorageAdapter();

export const getMonetizationConfig = async (req: Request, res: Response) => {
  try {
    const data = await storage.loadConfig();
    if (!data) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    // Handle both wrapped format (with _metadata) and raw format (legacy)
    if (data && data._metadata) {
      res.json(data.config);
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
};

const API_KEY = "AIzaSyDbWSqCXSftREI7Kby3kHvL2vbYwHVKBp4"; // Firebase config API Key

export const saveMonetizationConfig = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
    }
    const idToken = authHeader.split('Bearer ')[1];

    // Verify token with Google Identity Toolkit
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    const verifyData = await verifyRes.json();

    if (verifyData.error) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const email = verifyData.users?.[0]?.email || 'unknown';

    const validation = AdManagerConfigSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: 'Invalid configuration format', 
        details: validation.error.format() 
      });
    }

    const currentData = await storage.loadConfig();
    const currentVersion = currentData?._metadata?.version || 1;
    
    const configHash = getHash(validation.data);
    
    const versionInfo: VersionInfo = {
      version: currentVersion + 1,
      lastUpdated: new Date().toISOString(),
      updatedBy: email,
      configHash
    };

    await storage.saveConfig(validation.data, versionInfo);

    res.json({ success: true, metadata: versionInfo });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
};
