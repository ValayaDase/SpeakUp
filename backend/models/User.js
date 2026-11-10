const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    preferredLanguage: {
      type: String,
      enum: ['English', 'Hindi', 'Marathi', 'Hinglish'],
      default: 'English',
    },
    communicationGoals: {
      type: [String],
      default: ['Job Interview', 'Public Speaking'],
    },
    practicePreferences: {
      dailyTargetMinutes: { type: Number, default: 15 },
      targetDifficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' },
      enableCameraByDefault: { type: Boolean, default: true },
    },
    privacySettings: {
      storeRecordings: { type: Boolean, default: true },
      allowVisualAnalysis: { type: Boolean, default: true },
      allowAudioAnalysis: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to verify password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
