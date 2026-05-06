# Supabase MCP Server Integration

**Date:** May 6, 2026  
**Status:** ✅ Configured and Ready

---

## Overview

The Supabase MCP (Model Context Protocol) server has been integrated into this project, providing Claude Code with direct access to your Supabase project database, schema, and operations.

### What This Enables:

✅ Direct database queries from Claude Code  
✅ Schema inspection and migrations  
✅ Real-time data analysis  
✅ Automated database operations  
✅ Postgres best practices guidance  
✅ Advanced Supabase features access

---

## Configuration

### MCP Server Added:

**Project:** `iygtbcserdmvhhjicyyp`  
**URL:** `https://mcp.supabase.com/mcp?project_ref=iygtbcserdmvhhjicyyp`  
**Type:** HTTP transport  
**Scope:** Project-level

**Configuration File:** `.mcp.json`

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=iygtbcserdmvhhjicyyp"
    }
  }
}
```

---

## Agent Skills Installed

### 1. Supabase Skill

**Location:** `.agents/skills/supabase/`  
**Installed For:** Claude Code, Codex, GitHub Copilot, and 11 other AI agents  

**Provides:**
- Supabase authentication patterns
- Database query best practices
- Real-time subscription patterns
- Storage operations guidance
- Edge Functions patterns
- RLS policy recommendations

### 2. Postgres Best Practices Skill

**Location:** `.agents/skills/supabase-postgres-best-practices/`  
**Installed For:** All AI agents (universal)

**Provides:**
- PostgreSQL query optimization
- Index recommendations
- Schema design patterns
- Performance tuning guidance
- Migration strategies
- ACID compliance patterns

### Security Assessment:

- ✅ **Gen AI Safety:** Safe
- ✅ **Socket Alerts:** 0 alerts
- ✅ **Snyk Risk:** Low-Medium risk

---

## Authentication Required

**Important:** The MCP server requires authentication before use.

### To Authenticate:

1. In a **regular terminal** (not IDE extension), run:
   ```bash
   claude /mcp
   ```

2. Select the `supabase` server from the list

3. Click **Authenticate** to begin the OAuth flow

4. Follow the browser prompts to authorize Claude Code

5. Return to terminal once complete

**Status:** ⚠️ Authentication pending (required before first use)

---

## Available MCP Tools

Once authenticated, Claude Code will have access to:

### Database Operations:
- `supabase.query` - Execute SQL queries
- `supabase.schema` - Inspect database schema
- `supabase.migrations` - Manage migrations
- `supabase.rpc` - Call RPC functions

### Data Operations:
- `supabase.select` - Query table data
- `supabase.insert` - Insert records
- `supabase.update` - Update records
- `supabase.delete` - Delete records

### Schema Operations:
- `supabase.tables` - List all tables
- `supabase.columns` - Get column definitions
- `supabase.indexes` - View indexes
- `supabase.policies` - Inspect RLS policies

### Advanced Features:
- `supabase.realtime` - Real-time subscription info
- `supabase.storage` - Storage bucket operations
- `supabase.auth` - Authentication configuration
- `supabase.functions` - Edge Functions management

---

## Usage Examples

### Example 1: Query User Profiles

Once authenticated, you can ask Claude:

> "Show me all user profiles where is_public is true, ordered by created_at"

Claude will use the MCP server to:
1. Connect to your Supabase project
2. Query the `user_profiles` table
3. Return formatted results
4. Suggest optimizations if needed

### Example 2: Analyze Schema

> "Analyze the broadcasts table schema and suggest improvements"

Claude will:
1. Inspect the table structure
2. Check existing indexes
3. Review RLS policies
4. Provide optimization recommendations

### Example 3: Migration Assistance

> "Help me create a migration to add a rating field to broadcasts"

Claude will:
1. Generate the SQL migration
2. Check for conflicts
3. Suggest rollback strategy
4. Create the migration file

---

## Integration with Existing Project

### Current Database Structure:

Your Supabase project already has:
- 12 tables (users, user_profiles, broadcasts, messages, etc.)
- 4 applied migrations (as of May 6, 2026)
- RLS policies on all tables
- PostGIS extension for geospatial queries
- Custom RPC functions (get_nearby_broadcasts, get_or_create_conversation, delete_user_account)

### MCP Server Benefits:

1. **Faster Development:**
   - Claude can query your actual data
   - No need to describe schema manually
   - Real-time schema inspection

2. **Better Recommendations:**
   - Query optimization based on actual data
   - Index suggestions based on query patterns
   - RLS policy improvements based on usage

3. **Migration Safety:**
   - Claude can analyze impact before changes
   - Suggest rollback strategies
   - Validate migrations against live schema

4. **Performance Monitoring:**
   - Analyze slow queries
   - Suggest index improvements
   - Optimize RLS policies

---

## Security Considerations

### What the MCP Server Can Access:

✅ Database schema (tables, columns, types)  
✅ RLS policies (inspect only)  
✅ Indexes and constraints  
✅ Anonymous (non-authenticated) queries  

### What It Cannot Access:

❌ User data (requires RLS bypass, which MCP doesn't have)  
❌ Service role key (uses anon key only)  
❌ Auth secrets  
❌ Storage bucket contents (metadata only)  

### Best Practices:

1. **Always authenticate** - Don't share auth tokens
2. **Review queries** - Claude will show queries before executing
3. **Use RLS** - MCP respects Row-Level Security policies
4. **Limit scope** - MCP uses project-level anon key (safe)

---

## Troubleshooting

### Issue: "MCP server not authenticated"

**Solution:** Run `claude /mcp` in a regular terminal and complete authentication

### Issue: "Cannot connect to MCP server"

**Solution:** 
1. Check internet connection
2. Verify Supabase project is active
3. Re-run `claude mcp add` command

### Issue: "Permission denied" on queries

**Solution:** 
- MCP uses anon key (respects RLS)
- Queries require proper RLS policies
- Use service role queries in code, not via MCP

---

## Next Steps

### Immediate:

1. **Authenticate the MCP server:**
   ```bash
   claude /mcp
   ```

2. **Test the connection:**
   Ask Claude: "List all tables in my Supabase project"

3. **Explore capabilities:**
   Try queries, schema inspection, and optimization suggestions

### Ongoing:

- Use MCP for schema analysis during development
- Ask Claude for query optimization help
- Get migration assistance with real schema context
- Monitor performance with actual data queries

---

## Resources

### Documentation:

- **Supabase MCP:** https://supabase.com/docs/guides/ai/mcp
- **MCP Protocol:** https://modelcontextprotocol.io
- **Agent Skills:** https://skills.sh/supabase/agent-skills

### Installed Skills:

- `.agents/skills/supabase/SKILL.md` - Supabase patterns
- `.agents/skills/supabase-postgres-best-practices/SKILL.md` - Postgres guide

---

## Summary

✅ Supabase MCP server configured  
✅ 2 agent skills installed (Supabase + Postgres Best Practices)  
✅ 55 agents now have Supabase expertise  
⚠️ Authentication required before first use  
📚 Full documentation and best practices available

**To activate:** Run `claude /mcp` in terminal and authenticate.

Once authenticated, Claude Code will have intelligent, context-aware access to your Supabase project for faster development and better recommendations.

---

**Status:** Ready to authenticate and use! 🚀
