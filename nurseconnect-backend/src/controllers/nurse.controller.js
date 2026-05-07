// src/controllers/nurse.controller.js
const NurseProfile = require('../models/NurseProfile');
const User = require('../models/User');

const parseExperienceYears = (value) => {
  if (value === undefined || value === null || value === '') return value;
  if (typeof value === 'number') return value;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
};

// ─── POST /api/nurse/profile ──────────────────────────────────
const createProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    if (req.user.role !== 'nurse') {
      return res.status(403).json({ error: 'Only nurses can create a profile.' });
    }

    const existing = await NurseProfile.findOne({ userId });
    if (existing) {
      return res.status(409).json({ error: 'Profile already exists. Use PUT to update.' });
    }

    const {
      specializations,
      experience,
      bio,
      documents,
      location,
      hourlyRate,
      availability,
    } = req.body;

    const profile = await NurseProfile.create({
      userId,
      specializations: specializations || [],
      experience: parseExperienceYears(experience) || 0,
      bio,
      documents: documents || {},
      location: location || {},
      hourlyRate: hourlyRate || 0,
      availability: availability !== undefined ? availability : true,
    });

    res.status(201).json({ success: true, profile });
  } catch (error) {
    console.error('[Nurse CreateProfile]', error);
    res.status(500).json({ error: 'Failed to create nurse profile.' });
  }
};

// ─── GET /api/nurse/profile/:id ───────────────────────────────
const getProfile = async (req, res) => {
  try {
    const { id } = req.params;

    // id can be userId or profileId
    let profile = await NurseProfile.findById(id).populate('userId', '-password');
    if (!profile) {
      profile = await NurseProfile.findOne({ userId: id }).populate('userId', '-password');
    }

    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found.' });
    }

    res.json({ success: true, profile });
  } catch (error) {
    console.error('[Nurse GetProfile]', error);
    res.status(500).json({ error: 'Failed to fetch nurse profile.' });
  }
};

// ─── PUT /api/nurse/profile ───────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const allowedUpdates = [
      'specializations',
      'experience',
      'bio',
      'documents',
      'location',
      'currentLocation',
      'hourlyRate',
      'availability',
      'interviewScore',
      'interviewFeedback',
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'experience' ? parseExperienceYears(req.body[key]) : req.body[key];
      }
    }

    const profile = await NurseProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, runValidators: true, upsert: true }
    ).populate('userId', '-password');

    res.json({ success: true, profile });
  } catch (error) {
    console.error('[Nurse UpdateProfile]', error);
    res.status(500).json({ error: 'Failed to update nurse profile.' });
  }
};

// ─── GET /api/nurse/jobs ──────────────────────────────────────
// Returns approved nurses for patients to browse
const getApprovedNurses = async (req, res) => {
  try {
    const { city, specialization, page = 1, limit = 20 } = req.query;

    const filter = { status: 'approved', availability: true };

    if (city) {
      filter['location.city'] = { $regex: city, $options: 'i' };
    }
    if (specialization) {
      filter.specializations = { $in: [specialization] };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [nurses, total] = await Promise.all([
      NurseProfile.find(filter)
        .populate('userId', 'name email phone city')
        .sort({ rating: -1, experience: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      NurseProfile.countDocuments(filter),
    ]);

    res.json({
      success: true,
      nurses,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[Nurse GetApprovedNurses]', error);
    res.status(500).json({ error: 'Failed to fetch nurses.' });
  }
};

// ─── GET /api/nurse/my-profile ────────────────────────────────
const getMyProfile = async (req, res) => {
  try {
    const profile = await NurseProfile.findOne({ userId: req.user._id }).populate('userId', '-password');
    if (!profile) {
      return res.status(404).json({ error: 'Nurse profile not found. Please create one.' });
    }
    res.json({ success: true, profile });
  } catch (error) {
    console.error('[Nurse GetMyProfile]', error);
    res.status(500).json({ error: 'Failed to fetch your profile.' });
  }
};

module.exports = { createProfile, getProfile, updateProfile, getApprovedNurses, getMyProfile };
