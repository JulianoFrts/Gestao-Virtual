
const kmlSnippet = `
	<Style id="sectionInfo0">
		<BalloonStyle>
			<text><![CDATA[<h3>Section #1</h3>Voltage: 500kV<br>Cable: 'dotterel_acsr'<br>From Str.: TRIO_C1 Set 1 'PR1 (E)'<br>To Str.: 0/1A Set 1 'PR1 (E)'<br>Disp. Condition: PR1.Temp.Máxima 'Creep RS'<br><br>Sagging data: Catenary (m) 304.731, Horiz. Tension (daN) 196.3,  Condition 'Creep RS', Temperature (deg C) 40<br><br>]]></text>
		</BalloonStyle>
	</Style>
`;

const styleRegex = /<Style id="([^"]+)">[\s\S]*?<text><!\[CDATA\[([\s\S]*?)\]\]><\/text>/g;
let match = styleRegex.exec(kmlSnippet);

if (match) {
    console.log('✅ Match encontrado!');
    console.log('ID:', match[1]);
    console.log('HTML:', match[2]);

    const html = match[2];
    const extract = (label) => {
        const regex = new RegExp(`${label}:\\s*(.*?)(?:<br>|$)`, 'i');
        const m = html.match(regex);
        return m ? m[1].trim() : null;
    };

    console.log('Voltage:', extract('Voltage'));
    console.log('From:', extract('From Str.'));
} else {
    console.log('❌ Match NÃO encontrado.');
}
