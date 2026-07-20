const ObsidianUri = (() => {
  function resolveFilePath(template, date = new Date()) {
    const yyyy = String(date.getFullYear());
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const tokens = {
      '{{YYYY/MM/DD}}': `${yyyy}/${mm}/${dd}`,
      '{{YYYY-MM-DD}}': `${yyyy}-${mm}-${dd}`,
      '{{YYYY}}': yyyy,
      '{{MM}}': mm,
      '{{DD}}': dd
    };
    return Object.entries(tokens).reduce((path, [token, value]) => path.replaceAll(token, value), template.trim());
  }

  function build({ saveMode, customFile, vaultName, content, date }) {
    const vault = vaultName.trim();
    const query = (params) => Object.entries(params)
      .filter(([, value]) => value !== '')
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    if (saveMode === 'daily') {
      return `obsidian://daily?${query({ vault, append: 'true', content })}`;
    }
    if (!vault) throw new Error('VAULT_NAME_REQUIRED');
    return `obsidian://new?${query({ vault, file: resolveFilePath(customFile, date), append: 'true', content })}`;
  }

  return { build, resolveFilePath };
})();

if (typeof module !== 'undefined') module.exports = ObsidianUri;
