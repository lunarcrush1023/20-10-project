// Artwork adapted from the user-supplied Chuyến Bay Tinh Cầu V4 reference. No demo state or gameplay.
export function planetMarkup(v) {
  // Planet art direction: 3D-cartoon, satin surface, soft clouds, one discreet moon.
  // Deliberately no procedural noise, blocky stripes or busy satellite clusters.
  const styles = [
    {
      name: "LAM NGỌC",
      pale: "#e6fffc",
      light: "#8df4f4",
      mid: "#42bad9",
      shade: "#2460a3",
      night: "#142d72",
      air: "#75e9ee",
      ring: "#99efef",
      cloud: "#c9fbf1",
      detail: "#287eaf",
    },
    {
      name: "TỬ TINH",
      pale: "#fbebff",
      light: "#d3bcff",
      mid: "#aa82e9",
      shade: "#7056bd",
      night: "#302762",
      air: "#c3a4ff",
      ring: "#d7beff",
      cloud: "#f5d9ff",
      detail: "#7756ae",
    },
    {
      name: "HỒNG VÂN",
      pale: "#fff3f2",
      light: "#ffc8dc",
      mid: "#f48fb5",
      shade: "#d36d9f",
      night: "#733f80",
      air: "#ffb0cb",
      ring: "#ffd4dd",
      cloud: "#ffe5f0",
      detail: "#ac638b",
    },
    {
      name: "LỤC HẢI",
      pale: "#e7fff8",
      light: "#b4fbe5",
      mid: "#67d9bd",
      shade: "#3aaea9",
      night: "#1b6476",
      air: "#89ecca",
      ring: "#b0f4e0",
      cloud: "#e2fff8",
      detail: "#3d9ba4",
    },
    {
      name: "THÁI DƯƠNG",
      pale: "#fffbeb",
      light: "#ffe5a1",
      mid: "#f8bd72",
      shade: "#d88976",
      night: "#7d486b",
      air: "#ffe0a0",
      ring: "#ffead0",
      cloud: "#fff2d3",
      detail: "#cb9d7d",
    },
  ];
  const p = styles[v];
  const id = "world-" + v;
  const orbitTilt = [-17, -10, 12, -12, -20][v];
  const rings = [true, true, false, false, true][v];
  const ringBack = rings
    ? `<g transform="rotate(${orbitTilt} 260 240)">
     <ellipse cx="260" cy="240" rx="169" ry="45" fill="none" stroke="${p.ring}" stroke-opacity=".10" stroke-width="21"/>
     <ellipse cx="260" cy="240" rx="169" ry="45" fill="none" stroke="${p.ring}" stroke-opacity=".32" stroke-width="7"/>
     <ellipse cx="260" cy="240" rx="175" ry="47" fill="none" stroke="${p.light}" stroke-opacity=".22" stroke-width="1.6"/>
   </g>`
    : "";
  // Front half of ring below the equator (the upper half belongs behind the sphere).
  const arc = [...Array(50)]
    .map((_, i) => {
      let theta = Math.PI - (i * Math.PI) / 49;
      return `${(260 + 169 * Math.cos(theta)).toFixed(2)},${(240 + 45 * Math.sin(theta)).toFixed(2)}`;
    })
    .join(" ");
  const ringFront = rings
    ? `<g transform="rotate(${orbitTilt} 260 240)">
    <polyline points="${arc}" fill="none" stroke="${p.ring}" stroke-opacity=".12" stroke-width="14" stroke-linecap="round"/>
    <polyline points="${arc}" fill="none" stroke="${p.ring}" stroke-opacity=".68" stroke-width="4.2" stroke-linecap="round"/>
    <polyline points="${arc}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.1" stroke-linecap="round"/>
  </g>`
    : "";
  const art = [
    // T1: ocean-ice atmosphere, cloud wisps shaped like winds, no hard stripes.
    `<path d="M150 215c34-18 81-16 120-26 38-11 70-27 117-10" fill="none" stroke="${p.cloud}" stroke-width="20" stroke-linecap="round" opacity=".21" filter="url(#blur${v})"/>
     <path d="M154 262c62-30 97 2 163-18 22-7 41-18 65-18" fill="none" stroke="${p.cloud}" stroke-width="13" opacity=".30" stroke-linecap="round"/>
     <path d="M185 301c44-15 89-10 119-16 32-7 45-11 65-17" fill="none" stroke="${p.light}" stroke-width="20" opacity=".20" stroke-linecap="round" filter="url(#blur${v})"/>`,
    // T2: silky broad lilac gas clouds.
    `<path d="M144 191c66 9 105-36 162-29 34 4 49 9 87 5" fill="none" stroke="${p.cloud}" stroke-width="26" opacity=".27" stroke-linecap="round" filter="url(#blur${v})"/>
     <path d="M147 240c52-22 96-7 141-16 49-9 83-27 105-17" fill="none" stroke="${p.detail}" stroke-width="22" opacity=".27" stroke-linecap="round"/>
     <path d="M167 279c44 7 81-20 123-16 49 4 60-5 85-14" fill="none" stroke="${p.cloud}" stroke-width="21" opacity=".28" stroke-linecap="round" filter="url(#blur${v})"/>
     <path d="M210 301c48-13 100 7 145-6" fill="none" stroke="${p.pale}" stroke-width="5" opacity=".15" stroke-linecap="round"/>`,
    // T3: small softly rounded clouds and continents for rose planet.
    `<path d="M171 205c20-20 40-19 59-14 12 4 21-4 28-1 9 5 14 21 6 33-12 11-35 11-49 22-13 10-29-10-40-8-20 2-21-17-4-32z" fill="${p.pale}" opacity=".12"/>
     <path d="M299 260c13-8 35-8 48 0 22 13 21 30 3 40-11 7-27-3-43 5-13 5-34-11-26-26 3-8 11-14 18-19z" fill="${p.detail}" opacity=".17"/>
     <path d="M175 270c48-22 74-2 118-15 23-7 44-15 62-10" fill="none" stroke="${p.cloud}" stroke-width="15" stroke-linecap="round" opacity=".31" filter="url(#blur${v})"/>
     <path d="M210 171c23-8 46-10 70-4" fill="none" stroke="${p.pale}" stroke-width="11" stroke-linecap="round" opacity=".22"/>`,
    // T4: small jade islands under lightly diffused high white clouds.
    `<path d="M194 175c14-5 36-6 45 8 9 13 5 23-6 28-8 4-8 17-21 15-16-5-14-24-23-31-7-7-3-17 5-20z" fill="${p.light}" opacity=".27"/>
     <path d="M318 237c18-13 34-8 43 6 4 8 2 21-9 27-11 7-15 17-29 13-13-4-20-18-16-29 3-6 5-12 11-17z" fill="${p.pale}" opacity=".17"/>
     <path d="M160 243c52-18 80-8 118-20 44-14 64-15 101-8" fill="none" stroke="${p.cloud}" stroke-width="17" stroke-linecap="round" opacity=".24" filter="url(#blur${v})"/>
     <path d="M183 290c48-5 85-20 122-16 23 3 47 1 58-1" fill="none" stroke="${p.pale}" stroke-width="8" stroke-linecap="round" opacity=".24"/>`,
    // T5: special warm-gold planet, clouds as amber light trails.
    `<path d="M155 207c48-30 92-7 132-20 37-12 69-18 106-2" fill="none" stroke="${p.cloud}" stroke-width="24" stroke-linecap="round" opacity=".32" filter="url(#blur${v})"/>
     <path d="M176 268c52-5 78-22 130-21 32 2 48 3 67-7" fill="none" stroke="${p.pale}" stroke-width="14" stroke-linecap="round" opacity=".23"/>
     <path d="M203 302c27 0 54-10 84-9 24 0 47 4 60-2" fill="none" stroke="${p.detail}" stroke-width="17" stroke-linecap="round" opacity=".19" filter="url(#blur${v})"/>`,
  ][v];
  const moonPos = [
    { x: 416, y: 135, r: 12 },
    { x: 404, y: 135, r: 13 },
    { x: 405, y: 148, r: 11 },
    { x: 408, y: 143, r: 12 },
    { x: 413, y: 137, r: 11 },
  ][v];
  return `<svg viewBox="0 0 500 470" role="img" aria-label="Hành tinh hoạt hình 3D ${p.name}, ánh sáng mềm và một vệ tinh nhỏ">
    <defs>
      <radialGradient id="base${id}" cx="30%" cy="23%" r="79%">
        <stop offset="0%" stop-color="${p.pale}"/><stop offset="19%" stop-color="${p.light}"/>
        <stop offset="59%" stop-color="${p.mid}"/><stop offset="81%" stop-color="${p.shade}"/>
        <stop offset="100%" stop-color="${p.night}"/>
      </radialGradient>
      <radialGradient id="soft${id}" cx="25%" cy="22%" r="77%"><stop stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#071b4f" stop-opacity=".55"/></radialGradient>
      <radialGradient id="little${id}" cx="25%" cy="20%" r="75%"><stop stop-color="${p.pale}"/><stop offset=".55" stop-color="${p.mid}"/><stop offset="1" stop-color="${p.shade}"/></radialGradient>
      <filter id="blur${v}" x="-25%" y="-35%" width="150%" height="170%"><feGaussianBlur stdDeviation="8"/></filter>
      <clipPath id="disc${id}"><circle cx="260" cy="237" r="112"/></clipPath>
    </defs>
    <ellipse cx="260" cy="237" rx="213" ry="171" transform="rotate(-12 260 237)" stroke="${p.light}" opacity=".12" stroke-width="1.25" fill="none"/>
    ${ringBack}
    <g class="main-world">
      <circle cx="260" cy="237" r="121" fill="${p.air}" opacity=".11" filter="url(#blur${v})"/>
      <circle cx="260" cy="237" r="114" fill="${p.air}" opacity=".25"/>
      <g clip-path="url(#disc${id})">
        <circle cx="260" cy="237" r="112" fill="url(#base${id})"/>
        ${art}
        <circle cx="260" cy="237" r="112" fill="url(#soft${id})"/>
        <ellipse cx="216" cy="170" rx="47" ry="27" transform="rotate(-27 216 170)" fill="${p.pale}" opacity=".11" filter="url(#blur${v})"/>
      </g>
      <path d="M154 218C162 171 194 135 242 127" fill="none" stroke="${p.pale}" stroke-opacity=".32" stroke-width="2.2" stroke-linecap="round"/>
    </g>
    ${ringFront}
    <g class="side-world" opacity=".65">
      <circle cx="${moonPos.x}" cy="${moonPos.y}" r="${moonPos.r}" fill="url(#little${id})"/>
      <circle cx="${moonPos.x}" cy="${moonPos.y}" r="${moonPos.r + 2}" fill="none" stroke="${p.air}" stroke-opacity=".2"/>
    </g>
    <path d="M105 125v9m-4.5-4.5h9" stroke="${p.pale}" stroke-opacity=".42" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}
