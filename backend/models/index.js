const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CodeFile = sequelize.define('CodeFile', {
  id:       { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title:    { type: DataTypes.STRING(255), defaultValue: 'Untitled' },
  language: { type: DataTypes.ENUM('python','c','cpp','java'), allowNull: false },
  code:     { type: DataTypes.TEXT('long'), allowNull: false }
}, { tableName: 'code_files', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

const RunHistory = sequelize.define('RunHistory', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  language:       { type: DataTypes.ENUM('python','c','cpp','java'), allowNull: false },
  code:           { type: DataTypes.TEXT('long'), allowNull: false },
  stdin:          { type: DataTypes.TEXT },
  stdout:         { type: DataTypes.TEXT },
  stderr:         { type: DataTypes.TEXT },
  exit_code:      { type: DataTypes.INTEGER, defaultValue: 0 },
  execution_time: { type: DataTypes.FLOAT }
}, { tableName: 'run_history', timestamps: true, createdAt: 'ran_at', updatedAt: false });

module.exports = { sequelize, CodeFile, RunHistory };
