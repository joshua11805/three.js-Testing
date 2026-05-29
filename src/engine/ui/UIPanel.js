// Reusable collapsible dev panel. All layout is inline so no CSS dependency.
export class UIPanel {
  constructor({ title, top = '48px', right, left } = {}) {
    this._el = document.createElement('div')
    const side = left != null ? `left:${left}` : `right:${right ?? '12px'}`
    this._el.style.cssText = [
      'position:fixed', `top:${top}`, side, 'z-index:9999',
      'background:rgba(0,0,0,0.78)', 'color:#eee',
      'font:12px/1.6 monospace', 'padding:10px 14px',
      'border-radius:6px', 'min-width:240px', 'user-select:none',
    ].join(';')

    const header = document.createElement('div')
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px'

    const titleEl = document.createElement('span')
    titleEl.style.cssText = 'font-weight:bold;letter-spacing:1px'
    titleEl.textContent = title

    const toggleBtn = document.createElement('button')
    toggleBtn.textContent = 'hide'
    toggleBtn.style.cssText = 'background:none;border:1px solid #888;color:#ccc;cursor:pointer;padding:1px 6px;font:11px monospace;border-radius:3px'

    header.append(titleEl, toggleBtn)
    this._el.appendChild(header)

    this._body = document.createElement('div')
    this._el.appendChild(this._body)

    let collapsed = false
    toggleBtn.addEventListener('click', () => {
      collapsed = !collapsed
      this._body.style.display = collapsed ? 'none' : ''
      toggleBtn.textContent = collapsed ? 'show' : 'hide'
    })

    document.body.appendChild(this._el)
  }

  // fmt(value) → string; if omitted, falls back to toFixed(decimals)
  addSlider(label, { min, max, step, value, decimals = 2, fmt }, onChange) {
    const row = document.createElement('div')
    row.style.cssText = 'display:grid;grid-template-columns:90px 1fr 46px;align-items:center;gap:6px;margin-bottom:4px'

    const lbl = document.createElement('span')
    lbl.textContent = label
    lbl.style.color = '#aaa'

    const slider = document.createElement('input')
    slider.type  = 'range'
    slider.min   = min
    slider.max   = max
    slider.step  = step
    slider.value = value
    slider.style.cssText = 'width:100%;accent-color:#4af;cursor:pointer'

    const display = fmt ? fmt(value) : Number(value).toFixed(decimals)
    const valEl = document.createElement('span')
    valEl.textContent = display
    valEl.style.cssText = 'text-align:right;color:#4af'

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value)
      valEl.textContent = fmt ? fmt(v) : v.toFixed(decimals)
      onChange(v)
    })

    row.append(lbl, slider, valEl)
    this._body.appendChild(row)
    return this
  }

  // options: [{ label, value }]; activeValue is the initially active one
  addButtons(label, options, activeValue, onChange) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px'

    const lbl = document.createElement('span')
    lbl.textContent = label
    lbl.style.cssText = 'color:#aaa;min-width:90px'

    const grp = document.createElement('div')
    grp.style.cssText = 'display:flex;gap:3px'

    for (const { label: optLabel, value } of options) {
      const active = value === activeValue
      const btn = document.createElement('button')
      btn.textContent = optLabel
      btn.style.cssText = [
        `background:${active ? '#4af' : 'none'}`,
        'border:1px solid #4af',
        `color:${active ? '#000' : '#4af'}`,
        'cursor:pointer', 'padding:2px 6px', 'font:10px monospace', 'border-radius:3px',
      ].join(';')
      btn.addEventListener('click', () => {
        grp.querySelectorAll('button').forEach(b => {
          b.style.background = 'none'; b.style.color = '#4af'
        })
        btn.style.background = '#4af'
        btn.style.color = '#000'
        onChange(value)
      })
      grp.appendChild(btn)
    }

    row.append(lbl, grp)
    this._body.appendChild(row)
    return this
  }

  show() { this._el.style.display = '' }
  hide() { this._el.style.display = 'none' }
}
