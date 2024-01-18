import { promises as fs } from 'fs'
import * as core from '@actions/core'
import { marked } from 'marked'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
function versionFilter({
  versionText,
  versionMarkerType,
  versionMarkerDepth
}: {
  versionText: string
  versionMarkerType: string
  versionMarkerDepth: number
}) {
  return ({
    type,
    depth,
    text,
    tokens
  }: {
    type: string
    depth: number
    text?: string
    tokens: any[]
  }) =>
    [
      type === versionMarkerType,
      depth === versionMarkerDepth,
      [
        versionText && text?.startsWith(versionText),
        tokens?.[0].type == 'link' && tokens?.[0]?.text.startsWith(versionText)
      ].some(Boolean)
    ].every(Boolean)
}

export async function run(): Promise<void> {
  const versionText: string = core.getInput('version', { required: true })
  const versionMarkerType: string =
    core.getInput('version-marker-type') || 'heading'
  const versionMarkerDepth: number =
    Number(core.getInput('version-marker-depth')) || 2
  let changelog = marked.lexer(
    core.getInput('body') ||
      (await fs.readFile(core.getInput('bodyfile') || 'CHANGELOG.md', 'utf8'))
  ) as any[]

  // Slice the start
  changelog = changelog.slice(
    changelog.findIndex(
      versionFilter({ versionText, versionMarkerType, versionMarkerDepth })
    )
  )

  // Slice the end
  const versionEndIndex: number = changelog
    .slice(1)
    .findIndex(
      versionFilter({ versionText: '', versionMarkerType, versionMarkerDepth })
    )
  changelog = changelog.slice(
    0,
    versionEndIndex === -1 ? -1 : versionEndIndex + 1
  )

  core.setOutput('body', changelog.map(({ raw }) => raw).join(''))

  core.group('Output', async () =>
    core.info(changelog.map(({ raw }) => raw).join(''))
  )
}
