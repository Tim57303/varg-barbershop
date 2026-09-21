# Сборка вариантов «одним файлом»: ruby build.rb
#   dist/varg-single.html — весь сайт в одном файле (стили, скрипты, настройки, шрифты и фото внутри).
#                           Открывается где угодно, без папок. Удобно отправить клиенту на согласование.
#   dist/artifact.html    — то же для публикации в Claude (шрифты берутся с Google Fonts, у Claude такие правила).
require "base64"
require "fileutils"
Encoding.default_external = Encoding::UTF_8

def read(f)
  File.read(f)
end
def b64(f)
  Base64.strict_encode64(File.binread(f))
end

html   = read("index.html")
styles = read("styles.css")
config = read("config.js")
app    = read("app.js")

imgs = Dir["img/*.jpg"].sort.map { |f| [File.basename(f, ".jpg"), "data:image/jpeg;base64," + b64(f)] }
img_map = "window.IMG={" + imgs.map { |k, v| %("#{k}":"#{v}") }.join(",") + "};"

# шрифты: локальные файлы → data: URI
fonts_css = read("fonts/fonts.css").gsub(/url\(([^)]+\.woff2)\)/) { %(url(data:font/woff2;base64,#{b64("fonts/" + $1)})) }
google = %(<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Manrope:wght@400..800&family=Oswald:wght@500..700&display=swap">)

def strip_tags(h)
  h.gsub(%r{<link rel="(preload|icon|canonical)"[^>]*>\n?}, "")
end

def inline(html, styles_tag, scripts)
  h = html.dup
  h.sub!(%r{<link rel="stylesheet" href="fonts/fonts.css">\n<link rel="stylesheet" href="styles.css">}) { styles_tag }
  h.sub!(%r{<script src="config.js"></script>\n<script src="app.js"></script>}) { scripts }
  h
end

FileUtils.mkdir_p("dist")

# ── один файл
single = inline(
  strip_tags(html),
  "<style>\n#{fonts_css}\n#{styles}\n</style>",
  "<script>#{img_map}</script>\n<script>\n#{config}\n</script>\n<script>\n#{app}\n</script>"
)
File.write("dist/varg-single.html", single)

# ── для публикации в Claude: фрагмент без <html>/<head>/<body>
art = inline(
  strip_tags(html),
  "#{google}\n<style>\n#{styles}\n</style>",
  "<script>#{img_map}</script>\n<script>\n#{config}\n</script>\n<script>\n#{app}\n</script>"
)
title = "<title>ВАРГ Barbershop</title>"
head_links = art[/#{Regexp.escape(google)}\n<style>.*?<\/style>/m]
body = art[/<body>(.*)<\/body>/m, 1]
site = read("config.js")[/url:\s*"(https:\/\/[^"]+\/)"/, 1]
body = body.gsub('href="privacy.html"', %(href="#{site}privacy.html")) if site
File.write("dist/artifact.html", [title, head_links, body].join("\n"))

puts Dir["dist/*"].sort.map { |f| "#{f}  #{(File.size(f) / 1024.0).round} КБ" }
