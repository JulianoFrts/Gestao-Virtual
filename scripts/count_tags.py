import re
import sys

def count_tags(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    tags = [
        ('CardOpen', r'<Card\b'),
        ('CardClose', r'</Card>'),
        ('CardContentOpen', r'<CardContent\b'),
        ('CardContentClose', r'</CardContent>'),
        ('TabsOpen', r'<Tabs\b'),
        ('TabsClose', r'</Tabs>'),
        ('TabsContentOpen', r'<TabsContent\b'),
        ('TabsContentClose', r'</TabsContent>'),
        ('DialogOpen', r'<Dialog\b'),
        ('DialogClose', r'</Dialog>'),
        ('DialogContentOpen', r'<DialogContent\b'),
        ('DialogContentClose', r'</DialogContent>'),
        ('DivOpen', r'<div\b'),
        ('DivClose', r'</div>'),
        ('FragmentOpen', r'<>\b'),
        ('FragmentClose', r'</>')
    ]
    
    for name, pattern in tags:
        matches = list(re.finditer(pattern, content))
        print(f"{name}: {len(matches)}")
        if len(matches) > 0:
            lines = [content.count('\n', 0, m.start()) + 1 for m in matches]
            print(f"  Lines: {lines}")

if __name__ == "__main__":
    count_tags(sys.argv[1])
