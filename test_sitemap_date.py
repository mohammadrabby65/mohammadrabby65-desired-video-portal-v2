import xml.etree.ElementTree as ET
import dateutil.parser

tree = ET.parse('public/sitemap.xml')
root = tree.getroot()
ns = {'sitemap': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

for url in root.findall('sitemap:url', ns):
    lastmod = url.find('sitemap:lastmod', ns)
    if lastmod is not None:
        try:
            dateutil.parser.isoparse(lastmod.text)
        except Exception as e:
            print(f"Invalid date: {lastmod.text}")
print("Done date check")
