# encoding: utf-8

Gem::Specification.new do |s|
  s.name          = "damien_scieur_homepage"
  s.version       = "0.0.4"
  s.authors       = ["Damien Scieur"]
  s.email         = ["damien.scieur@gmail.com"]
  s.homepage      = "https://damienscieur.com"
  s.summary		  = "Damien Scieur's Homepage"

  s.files         = `git ls-files -z`.split("\x0").select do |f|
    f.match(%r{^((_includes|_layouts|_sass|assets)/|(LICENSE|README)((\.(txt|md|markdown)|$)))}i)
  end

  s.platform      = Gem::Platform::RUBY
  s.add_runtime_dependency "jekyll"
end
