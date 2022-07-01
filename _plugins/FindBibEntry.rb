module Jekyll



  module FindBibEntry
		
		BanStrings = ["paperpdf","paperurl","abstract"]

		non_delimiters = /[^(){}\[\]]*/
		Paired = /\(#{non_delimiters}\)|\{#{non_delimiters}\}|\[#{non_delimiters}\]/
		Delimiter = /[(){}\[\]]/
		def balanced? s # check if s is ballanced between two brackets
			s = s.dup
			s.gsub!(Paired, "".freeze) while s =~ Paired
			s !~ Delimiter
		end
		
	def hrefBib(entry, link)
		newHref = '<b><a href="' + link + '" target="_blank">'
		entry=entry.gsub('<b>', newHref)
		entry=entry.gsub('</b>', '</a></b>')
		
		return entry
	end
	
	
	def internalhrefBib(entry, site, path, filename)
		newHref = '<b><a href="' + site + '/' + path + '/' + filename + '" target="_blank">'
		
		entry=entry.gsub('<b>', newHref)
		entry=entry.gsub('</b>', '</a></b>')
		
		return entry
	end


    def find_bib_entry(filename, key)
		# search a bib entry based on the key
			entryfound = false;
			s = "";
			File.open(filename) do |f|
				f.any? do |line|

					if entryfound
						if not balanced?(s) # if s in unbalanced in parenthesis or other, then we need to continue.
							if not BanStrings.any? { |banstr| line.include? banstr }
								s << line; # we check if the line contains a forbiden string, like paperpdf
							end
						else
							break;  # we are done!
						end
					end

					if (line.include?(key) && !entryfound)
						entryfound = true #if the key is found, be append the line
						s << line;
						if balanced?(s)
							
						end
					end
					
				end
			end
			s 
			return s
    end

		def correctBibEntry(entry)
			s = "";
			entry.each_line do |line|
				if not BanStrings.any? { |banstr| line.include? banstr }
					s << line; # we check if the line contains a forbiden string, like paperpdf
				end
			end
			s.sub!("{%raw%}", "")
			s.sub!("{%endraw%}", "")
			s # return
			return s
    end

  end
end

Liquid::Template.register_filter(Jekyll::FindBibEntry)
