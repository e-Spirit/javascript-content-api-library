import { Logger } from '../../modules'
import XMLParser from '../../modules/XMLParser'

var logger: Logger

describe('XMLParser', () => {
  it('should parse the String correctly', () => {
    expect(() =>
      new XMLParser(logger).parse(
        '<table data-fs-style=""><tr><td>Empty</td><td>&nbsp;</td><td>&nbsp;</td></tr><tr><td>&lt;</td><td>&gt;</td><td>&nbsp;</td></tr><tr><td>CMS Content Elements (called Modules or Section Templates)</td><td>36</td><td>1</td></tr><tr><td>CMS Page Types</td><td>27</td><td>1</td></tr><tr><td>Link Types, SEO, Sitemap &amp; Metadata</td><td>1</td><td>10</td></tr><tr><td>Global Content</td><td>1</td><td>10</td></tr><tr><td>Frontend Tailwind components</td><td>32</td><td>1.5</td></tr><tr><td>Location äöü é</td><td>1</td><td>9<br></td></tr></table>',
        '-'
      )
    ).toEqual('')
  })
})
