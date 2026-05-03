export function ContactEditorSheet({
  editorRef,
  draft,
  cityPresets,
  contactGroups,
  onDraftChange,
  onCancel,
  onSubmit,
}) {
  const selectedGroupIds = Array.isArray(draft.groupIds) && draft.groupIds.length > 0 ? draft.groupIds : [contactGroups[0]?.id];
  const toggleGroup = (groupId) => {
    onDraftChange((current) => {
      const currentGroupIds =
        Array.isArray(current.groupIds) && current.groupIds.length > 0 ? current.groupIds : [contactGroups[0]?.id];
      const isSelected = currentGroupIds.includes(groupId);
      const nextGroupIds = isSelected
        ? currentGroupIds.filter((item) => item !== groupId)
        : [...currentGroupIds, groupId];

      return {
        ...current,
        groupIds: nextGroupIds.length > 0 ? nextGroupIds : [groupId],
      };
    });
  };

  return (
    <form ref={editorRef} className="contact-editor-sheet" onSubmit={onSubmit}>
      <div className="contact-editor-header">
        <span className="contact-editor-kicker">NEW CONTACT</span>
        <button type="button" className="contact-editor-close" onClick={onCancel} aria-label="取消新建联系人">
          取消
        </button>
      </div>

      <label className="contact-editor-field">
        <span>姓名</span>
        <input
          value={draft.name}
          onChange={(event) => onDraftChange((current) => ({ ...current, name: event.target.value }))}
          maxLength="12"
          autoFocus
        />
      </label>

      <section className="contact-editor-field">
        <span>分组</span>
        <div className="contact-group-picker">
          {contactGroups.map((group) => (
            <button
              key={group.id}
              type="button"
              className={selectedGroupIds.includes(group.id) ? 'contact-group-option is-active' : 'contact-group-option'}
              aria-pressed={selectedGroupIds.includes(group.id)}
              onClick={() => toggleGroup(group.id)}
            >
              {group.label}
            </button>
          ))}
        </div>
      </section>

      <label className="contact-editor-field">
        <span>城市</span>
        <select
          value={draft.cityId}
          onChange={(event) => onDraftChange((current) => ({ ...current, cityId: event.target.value }))}
        >
          {cityPresets.map((city) => (
            <option key={city.id} value={city.id}>
              {city.label}
            </option>
          ))}
        </select>
      </label>

      <label className="contact-editor-field">
        <span>头像 URL</span>
        <input
          value={draft.imageUrl}
          onChange={(event) => onDraftChange((current) => ({ ...current, imageUrl: event.target.value }))}
          placeholder="可留空"
        />
      </label>

      <button type="submit" className="contact-editor-submit">
        完成
      </button>
    </form>
  );
}
