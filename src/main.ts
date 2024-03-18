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
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    tokens: any[]
  }) =>
    [
      type === versionMarkerType,
      depth === versionMarkerDepth,
      [
        text?.startsWith(versionText || ''),
        tokens?.[0].type === 'link' &&
          tokens?.[0]?.text.startsWith(versionText || '')
      ].some(Boolean)
    ].every(Boolean)
}

export async function run(): Promise<void> {
  const versionText: string = core.getInput('version', { required: true })
  const versionMarkerType: string =
    core.getInput('version-marker-type') || 'heading'
  const versionMarkerDepth: number =
    Number(core.getInput('version-marker-depth')) || 2
  const includeHeader: boolean = core.getBooleanInput('include-header')

  let changelogBody: string =
    core.getInput('changelog') ||
    (await fs.readFile(
      core.getInput('changelog-file') || 'CHANGELOG.md',
      'utf8'
    ))

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  let changelog = marked.lexer(changelogBody) as any[]

  // Slice the start
  const versionStartIndex: number = changelog.findIndex(
    versionFilter({ versionText, versionMarkerType, versionMarkerDepth })
  )
  changelog = changelog.slice(versionStartIndex)

  if (versionStartIndex === -1) {
    return core.setFailed(`Could not find version ${versionText} in changelog`)
  }

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

  // Remove the version marker
  if (!includeHeader) changelog = changelog.slice(1)

  core.setOutput('body', changelog.map(({ raw }) => raw).join(''))

  core.group('Output', async () =>
    core.info(changelog.map(({ raw }) => raw).join(''))
  )
}
