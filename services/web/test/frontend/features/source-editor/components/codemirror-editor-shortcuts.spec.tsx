import { mockScope } from '../helpers/mock-scope'
import { EditorProviders } from '../../../helpers/editor-providers'
import CodeMirrorEditor from '../../../../../frontend/js/features/source-editor/components/codemirror-editor'
import { metaKey } from '../helpers/meta-key'
import { FC } from 'react'
import { activeEditorLine } from '../helpers/active-editor-line'

const Container: FC = ({ children }) => (
  <div style={{ width: 785, height: 785 }}>{children}</div>
)

const CHARACTERS =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\\0123456789'

describe('keyboard shortcuts', { scrollBehavior: false }, function () {
  beforeEach(function () {
    window.metaAttributesCache.set('ol-preventCompileOnLoad', true)
    cy.interceptEvents()
    cy.interceptSpelling()

    const scope = mockScope()

    cy.mount(
      <Container>
        <EditorProviders scope={scope}>
          <CodeMirrorEditor />
        </EditorProviders>
      </Container>
    )

    cy.get('.cm-line').eq(16).click().as('line')
    cy.get('.cm-editor').as('editor')
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
  })

  it('comment line with {meta+shift+/}', function () {
    cy.get('@line')
      .type('text')
      .type(`{${metaKey}+shift+/}`)
      .should('have.text', '% text')

    cy.get('@line').type(`{${metaKey}+shift+/}`).should('have.text', 'text')
  })

  it('comment line with {meta+/}', function () {
    cy.get('@line')
      .type('text')
      .type(`{${metaKey}+/}`)
      .should('have.text', '% text')

    cy.get('@line').type(`{${metaKey}+/}`).should('have.text', 'text')
  })

  it('comment line with {meta+ß}', function () {
    cy.get('@line')
      .type('text')
      .type(`{${metaKey}+ß}`)
      .should('have.text', '% text')

    cy.get('@line').type(`{${metaKey}+ß}`).should('have.text', 'text')
  })

  it('comment line with {ctrl+#}', function () {
    cy.get('@line').type('text')
    cy.get('@editor').trigger('keydown', { key: '#', ctrlKey: true })
    cy.get('@line').should('have.text', '% text')

    cy.get('@editor').trigger('keydown', { key: '#', ctrlKey: true })
    cy.get('@line').should('have.text', 'text')
  })

  it('undo line with {meta+z}', function () {
    cy.get('@line').type('text').type(`{${metaKey}+z}`).should('have.text', '')
  })

  it('redo line with {meta+shift+z}', function () {
    cy.get('@line')
      .type('text')
      .type(`{${metaKey}+z}`) // undo
      .type(`{${metaKey}+shift+z}`) // redo
      .should('have.text', 'text')
  })

  it('redo line with {meta+y}', function () {
    cy.get('@line')
      .type('text')
      .type(`{${metaKey}+z}`) // undo
      .type(`{${metaKey}+y}`) // redo
      .should('have.text', 'text')
  })

  it('delete line with {meta+d}', function () {
    cy.get('.cm-line').then($lines => {
      const linesCount = $lines.length
      cy.get('@line').type(`{${metaKey}+d}`)
      cy.get('.cm-line').should('have.length', linesCount - 1)
    })
  })

  it('indent line with {tab}', function () {
    cy.get('@line')
      .trigger('keydown', { key: 'Tab' })
      .should('have.text', '    ')
  })

  it('unindent line with {shift+tab}', function () {
    cy.get('@line')
      .trigger('keydown', { key: 'Tab' }) // indent
      .trigger('keydown', { key: 'Tab', shiftKey: true }) // unindent
      .should('have.text', '')
  })

  it('uppercase selection with {ctrl+u}', function () {
    cy.get('@line')
      .type('a')
      .type('{shift+leftArrow}') // select text
      .type('{ctrl+u}')
      .should('have.text', 'A')
  })

  it('lowercase selection with {ctrl+shift+u}', function () {
    if (navigator.platform.startsWith('Linux')) {
      // Skip test as {ctrl+shift+u} is bound elsewhere in some Linux systems
      // eslint-disable-next-line mocha/no-skipped-tests
      this.skip()
    }

    cy.get('@line')
      .type('A')
      .type('{shift+leftArrow}') // select text
      .type('{ctrl+shift+u}') // TODO: ctrl+shift+u is a system shortcut so this fails in CI
      .should('have.text', 'a')
  })

  it('wrap selection with "\\textbf{}" by using {meta+b}', function () {
    cy.get('@line')
      .type('a')
      .type('{shift+leftArrow}') // select text
      .type(`{${metaKey}+b}`)
      .should('have.text', '\\textbf{a}')
  })

  it('wrap selection with "\\textit{}" by using {meta+i}', function () {
    cy.get('@line')
      .type('a')
      .type('{shift+leftArrow}') // select text
      .type(`{${metaKey}+i}`)
      .should('have.text', '\\textit{a}')
  })
})

describe('emacs keybindings', { scrollBehavior: false }, function () {
  beforeEach(function () {
    window.metaAttributesCache.set('ol-preventCompileOnLoad', true)
    cy.interceptEvents()
    cy.interceptSpelling()

    // Make a short doc that will fit entirely into the dom tree, so that
    // index() corresponds to line number - 1
    const shortDoc = `
\\documentclass{article}
\\begin{document}
contentLine1
contentLine2
contentLine3
\\end{document}
`

    const scope = mockScope(shortDoc)
    scope.settings.mode = 'emacs'

    cy.mount(
      <Container>
        <EditorProviders scope={scope}>
          <CodeMirrorEditor />
        </EditorProviders>
      </Container>
    )
    cy.get('.cm-line').eq(1).scrollIntoView().click().as('line')
    cy.get('.cm-editor').as('editor')
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
  })

  it('emulates search behaviour', function () {
    activeEditorLine().index().should('equal', 1)

    // Search should be closed
    cy.findByRole('search').should('have.length', 0)

    // Invoke C-s
    cy.get('@line').type('{ctrl}s')

    // Search should now be open
    cy.findByRole('search').should('have.length', 1)
    cy.findByRole('textbox', { name: 'Find' }).as('search-input')

    // Write a search query
    cy.get('@search-input').should('have.focus').type('contentLine')
    cy.contains(`1 of 3`)
    // Should assert that activeEditorLine.index() === 21, but activeEditorLine
    // only works if editor is focused, not the search box.

    // Repeated C-s should go to next match
    cy.get('@search-input').type('{ctrl}s')
    cy.contains(`2 of 3`)
    // Should assert that activeEditorLine.index() === 22, but activeEditorLine
    // only works if editor is focused, not the search box.

    // C-g should close the search
    cy.get('@search-input').type('{ctrl}g')
    cy.findByRole('search').should('have.length', 0)

    // Cursor should be back to where the search originated from
    activeEditorLine().index().should('equal', 1)

    // Invoke C-r
    cy.get('@line').type('{ctrl}r')

    // Search should now be open at first match
    cy.findByRole('search').should('have.length', 1)
    cy.contains(`1 of 3`)

    // Repeated C-r should go to previous match
    cy.get('@search-input').type('{ctrl}r')
    cy.contains(`3 of 3`)

    // Close search panel to clear global variable
    cy.get('@search-input').type('{ctrl}g')
    cy.findByRole('search').should('have.length', 0)
  })

  it('toggle comments with M-;', function () {
    cy.get('@line')
      .should('have.text', '\\documentclass{article}')
      .type('{alt};')
      .should('have.text', '% \\documentclass{article}')
  })

  it('should jump between start and end with M-S-, and M-S-.', function () {
    activeEditorLine().index().should('equal', 1)
    activeEditorLine().type('{alt}{shift},')
    activeEditorLine().index().should('equal', 0)
    activeEditorLine().type('{alt}{shift}.')
    activeEditorLine().index().should('equal', 7)
  })

  it('can enter characters', function () {
    cy.get('.cm-line')
      .eq(0)
      .scrollIntoView()
      .click()
      .type(CHARACTERS)
      .should('have.text', CHARACTERS)
  })
})

describe('vim keybindings', { scrollBehavior: false }, function () {
  beforeEach(function () {
    window.metaAttributesCache.set('ol-preventCompileOnLoad', true)
    cy.interceptEvents()
    cy.interceptSpelling()

    // Make a short doc that will fit entirely into the dom tree, so that
    // index() corresponds to line number - 1
    const shortDoc = `
\\documentclass{article}
\\begin{document}
contentLine1
contentLine2
contentLine3
\\end{document}
`

    const scope = mockScope(shortDoc)
    scope.settings.mode = 'vim'

    cy.mount(
      <Container>
        <EditorProviders scope={scope}>
          <CodeMirrorEditor />
        </EditorProviders>
      </Container>
    )
    cy.get('.cm-line').eq(1).scrollIntoView().click().as('line')
    cy.get('.cm-editor').as('editor')
  })

  afterEach(function () {
    window.metaAttributesCache = new Map()
  })

  it('can enter characters', function () {
    cy.get('.cm-line')
      .eq(0)
      .scrollIntoView()
      .click()
      .type(`i${CHARACTERS}{esc}`)
      .should('have.text', CHARACTERS)
  })

  it('can move around in normal mode', function () {
    // Move cursor up
    cy.get('@line').type('k')
    activeEditorLine().index().should('equal', 0)

    // Move cursor down
    cy.get('@line').type('j')
    activeEditorLine().index().should('equal', 2)

    // Move the cursor left, insert 1, move it right, insert a 2
    cy.get('@line')
      .type('hi1{esc}la2{esc}')
      .should('have.text', '\\documentclass{article1}2')
  })
})
