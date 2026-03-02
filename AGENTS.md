# AGENTS.md - AI Agent Guidelines

This file guides AI agents working on this repository.

## Review Guidelines

### Security (P0 - Critical)
- Don't log PII (Personally Identifiable Information)
- Verify that authentication middleware wraps every route
- Flag hardcoded secrets or default credentials as P0
- Flag unprotected admin endpoints as P0
- Flag JWT claim inconsistencies as P0

### Performance (P1 - High)
- Flag missing database connection pooling as P1
- Flag duplicate PrismaClient instantiation as P1
- Flag excessive polling in UI components as P1

### Code Quality (P1)
- Flag inconsistent error handling as P1
- Flag duplicate/legacy code that should be removed
- Flag console.log in production code

### General
- Focus on actionable fixes
- Provide specific file locations and suggestions
- Flag bugs that would cause runtime failures

## Task Guidelines

When fixing issues:
1. Explain what the issue is
2. Show the fix with code
3. Test the fix if possible
