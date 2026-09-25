import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import TaskBuilder from './TaskBuilder'
import { createLevelBookends } from './levelBookends'

jest.mock('./AudioSelector', () => () => null)

let container, root, tasks
beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
})
afterEach(() => {
    act(() => root.unmount())
    container.remove()
})

function render(initialTasks = createLevelBookends()) {
    function Harness() {
        const [value, setValue] = React.useState(initialTasks)
        tasks = value
        return <TaskBuilder tasks={value} onChange={setValue} />
    }
    act(() => root.render(<Harness />))
}

function click(text) {
    const button = Array.from(container.querySelectorAll('button')).find(
        (candidate) => candidate.textContent.trim() === text
    )
    act(() => button.click())
}

function typeSelects() {
    return Array.from(container.querySelectorAll('select')).filter((select) =>
        select.querySelector('option[value="get ready"]')
    )
}

function expandBookends() {
    const summaries = Array.from(container.querySelectorAll('.task-bookend-summary'))
    act(() => {
        summaries.forEach((button) => button.click())
    })
}

test('add-task buttons are grouped by training, interstitial, special, and clipboard', () => {
    render()
    const labels = Array.from(container.querySelectorAll('.task-add-group-label')).map(
        (el) => el.textContent.trim()
    )
    expect(labels).toEqual(['Training', 'Interstitial', 'Special', 'Clipboard'])
    expect(container.querySelector('.task-add-bar')).not.toBeNull()
    expect(
        Array.from(container.querySelectorAll('.task-add-bar button')).map((button) =>
            button.textContent.trim()
        )
    ).toEqual([
        '+ Hold',
        '+ Up/Down',
        '+ Hit Depth',
        '+ Hold and Clap',
        '+ Rest',
        '+ Clap',
        '+ Speak',
        '+ Endless',
        '+ Get Ready',
        '+ Finish',
        '+ Paste Task',
        '(Clear clipboard)',
    ])
})

test('bookends collapse to the task number and type', () => {
    render()
    const summaries = container.querySelectorAll('.task-bookend-summary')
    expect(summaries).toHaveLength(2)
    expect(summaries[0].textContent).toContain('#1')
    expect(summaries[0].textContent).toContain('Get Ready')
    expect(summaries[1].textContent).toContain('#2')
    expect(summaries[1].textContent).toContain('Finish')
    expect(typeSelects()).toHaveLength(0)

    act(() => summaries[0].click())
    expect(container.querySelectorAll('.task-bookend-summary')).toHaveLength(1)
    expect(typeSelects()).toHaveLength(1)
    expect(typeSelects()[0].disabled).toBe(true)
    expect(container.textContent).toContain('Level Start')

    act(() => container.querySelector('[aria-label="Collapse task 1"]').click())
    expect(container.querySelectorAll('.task-bookend-summary')).toHaveLength(2)
    expect(typeSelects()).toHaveLength(0)
})

test('bookends stay fixed while middle tasks are added, reordered and deleted', () => {
    render()
    expect(tasks.map((task) => task.type)).toEqual(['get ready', 'finish'])
    expect(container.querySelector('.task-middle-empty').textContent).toMatch(/middle of your level/)
    expandBookends()
    expect(container.querySelectorAll('.button-delete')).toHaveLength(0)
    expect(typeSelects().every((select) => select.disabled)).toBe(true)

    click('+ Hold')
    click('+ Rest')
    expect(tasks.map((task) => task.type)).toEqual(['get ready', 'hold', 'rest', 'finish'])
    expect(container.querySelector('.task-middle-empty')).toBeNull()

    const up = container.querySelectorAll('[aria-label$="up"]')
    const down = container.querySelectorAll('[aria-label$="down"]')
    expect(up).toHaveLength(2)
    expect(up[0].disabled).toBe(true)
    expect(down[1].disabled).toBe(true)
    act(() => up[1].click())
    expect(tasks.map((task) => task.type)).toEqual(['get ready', 'rest', 'hold', 'finish'])

    act(() => container.querySelector('.button-delete').click())
    act(() => container.querySelector('.button-delete').click())
    expect(tasks.map((task) => task.type)).toEqual(['get ready', 'finish'])
})

test('a Get Ready or Finish added in the middle stays movable', () => {
    render()
    click('+ Get Ready')
    click('+ Finish')
    expandBookends()
    expect(tasks.map((task) => task.type)).toEqual(['get ready', 'get ready', 'finish', 'finish'])
    const selects = typeSelects()
    expect(selects[0].disabled).toBe(true)
    expect(selects[1].disabled).toBe(false)
    expect(selects[2].disabled).toBe(false)
    expect(selects[3].disabled).toBe(true)
    expect(container.querySelectorAll('.button-delete')).toHaveLength(2)
})

test('existing tasks stay in order without adding missing bookends', () => {
    const original = [{ type: 'rest', timeLimit: 12 }, { type: 'hold', repeat: 5 }]
    render(original)
    expect(tasks).toEqual(original)
    expect(container.querySelectorAll('.button-delete')).toHaveLength(2)
    click('+ Clap')
    expect(tasks.map((task) => task.type)).toEqual(['rest', 'hold', 'clap'])
    act(() => container.querySelectorAll('[aria-label$="up"]')[1].click())
    expect(tasks.map((task) => task.type)).toEqual(['hold', 'rest', 'clap'])
})

test('an empty imported level accepts tasks without adding bookends', () => {
    render([])
    click('+ Rest')
    expect(tasks.map((task) => task.type)).toEqual(['rest'])
    act(() => container.querySelector('.button-delete').click())
    expect(tasks).toEqual([])
})
