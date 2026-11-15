const fs = require('fs');
const path = require('path');

const targets = [
  path.join(__dirname, '..', 'node_modules', 'deezer-js', 'deezer', 'utils.js'),
  path.join(__dirname, '..', 'server', 'node_modules', 'deezer-js', 'deezer', 'utils.js')
];

let patchedCount = 0;

targets.forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix: Cannot read properties of undefined (reading 'HREF')
    if (content.includes('result.preview = track.MEDIA[0].HREF')) {
      content = content.replace(
        'result.preview = track.MEDIA[0].HREF',
        "result.preview = (track.MEDIA && track.MEDIA[0] && track.MEDIA[0].HREF) ? track.MEDIA[0].HREF : (track.preview || null)"
      );
      modified = true;
    }

    // Fix: Unhandled undefined EXPLICIT_TRACK_CONTENT
    if (content.includes('result.explicit_content_lyrics = track.EXPLICIT_TRACK_CONTENT.EXPLICIT_LYRICS_STATUS')) {
      content = content.replace(
        'result.explicit_content_lyrics = track.EXPLICIT_TRACK_CONTENT.EXPLICIT_LYRICS_STATUS',
        'result.explicit_content_lyrics = track.EXPLICIT_TRACK_CONTENT ? track.EXPLICIT_TRACK_CONTENT.EXPLICIT_LYRICS_STATUS : 0'
      );
      modified = true;
    }

    if (content.includes('result.explicit_content_cover = track.EXPLICIT_TRACK_CONTENT.EXPLICIT_COVER_STATUS')) {
      content = content.replace(
        'result.explicit_content_cover = track.EXPLICIT_TRACK_CONTENT.EXPLICIT_COVER_STATUS',
        'result.explicit_content_cover = track.EXPLICIT_TRACK_CONTENT ? track.EXPLICIT_TRACK_CONTENT.EXPLICIT_COVER_STATUS : 0'
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[patch-dependencies] Successfully patched ${filePath}`);
      patchedCount++;
    } else {
      console.log(`[patch-dependencies] Already patched or no matching patterns in ${filePath}`);
    }
  }
});

console.log(`[patch-dependencies] Done. Patched ${patchedCount} file(s).`);
