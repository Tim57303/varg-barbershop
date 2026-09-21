# Сборка: ruby build.rb
#   dist/varg-single.html — один файл, фото внутри (открывается где угодно, без папки img/)
#   dist/artifact.html    — тот же сайт без <html>/<head>/<body>, для публикации в Claude
require "base64"
require "fileutils"
Encoding.default_external = Encoding::UTF_8

src  = File.read("index.html")
imgs = Dir["img/*.jpg"].sort.map { |f| [File.basename(f, ".jpg"), "data:image/jpeg;base64," + Base64.strict_encode64(File.binread(f))] }
map  = "<script>window.IMG={" + imgs.map { |k, v| %("#{k}":"#{v}") }.join(",") + "};</script>\n"

idx  = src.rindex("<script>")            # последний <script> — основной
full = src[0...idx] + map + src[idx..-1]

FileUtils.mkdir_p("dist")
File.write("dist/varg-single.html", full)

title = "<title>ВАРГ Barbershop</title>"
font  = full[/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/]
style = full[/<style>.*?<\/style>/m]
body  = full[/<body>(.*)<\/body>/m, 1]
File.write("dist/artifact.html", [title, font, style, body].join("\n"))
puts Dir["dist/*"].map { |f| "#{f}  #{(File.size(f) / 1024.0).round} КБ" }
