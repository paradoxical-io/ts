#!/usr/bin/env ruby

branch=`git rev-parse --abbrev-ref HEAD`

Jira = Struct.new(:jira)
Format = /.*-?(CU-[0-9]+)/

def parse_line(line)
  line.match(Format) { |m| Jira.new(*m.captures) }
end

COMMIT = ARGV[0]
result = parse_line(branch)

if result
  puts "#{result.jira} - #{COMMIT}"
else
  puts COMMIT
end
