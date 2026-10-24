#!/usr/bin/perl
# A tiny web server for the test lab, used when Python isn't installed.
# Every Mac has Perl, so this needs nothing extra.
# Usage: perl test/serve.pl PORT FOLDER
use strict;
use warnings;
use IO::Socket::INET;
use Cwd 'abs_path';

my ($port, $root) = @ARGV;
$port ||= 8000;
$root = abs_path($root // '.');

my %mime = (
  html => 'text/html; charset=utf-8',
  js => 'text/javascript; charset=utf-8',
  css => 'text/css; charset=utf-8',
  json => 'application/json',
  webmanifest => 'application/manifest+json',
  svg => 'image/svg+xml',
  png => 'image/png',
  ico => 'image/x-icon',
  md => 'text/plain; charset=utf-8',
  txt => 'text/plain; charset=utf-8',
);

my $server = IO::Socket::INET->new(
  LocalAddr => '0.0.0.0', LocalPort => $port, Listen => 50, ReuseAddr => 1, Proto => 'tcp',
) or die "Couldn't start on port $port: $!\n";

$SIG{CHLD} = 'IGNORE';  # finished requests clean themselves up
$SIG{PIPE} = 'IGNORE';

sub reply {
  my ($c, $code, $type, $body, $head) = @_;
  my %text = (200 => 'OK', 400 => 'Bad Request', 404 => 'Not Found', 405 => 'Method Not Allowed');
  print $c "HTTP/1.1 $code $text{$code}\r\nContent-Type: $type\r\nContent-Length: " . length($body) .
    "\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n";
  print $c $body unless $head;
}

while (1) {
  my $c = $server->accept or next;
  my $pid = fork;
  if (!defined $pid) { close $c; next; }
  if ($pid) { close $c; next; }  # parent goes back to waiting

  # Child: handle one request, then exit.
  close $server;
  alarm 10;  # give up on connections that never send a request
  my $line = <$c>;
  exit 0 unless defined $line;
  while (my $h = <$c>) { last if $h =~ /^\r?\n$/; }
  my ($method, $target) = $line =~ m{^(\w+)\s+(\S+)};
  $method //= '';
  if ($method ne 'GET' && $method ne 'HEAD') { reply($c, 405, 'text/plain', "Not allowed\n"); exit 0; }

  my $path = $target // '/';
  $path =~ s/[?#].*//s;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  my $file = "$root$path";
  $file .= 'index.html' if $file =~ m{/$};
  $file .= '/index.html' if -d $file;
  my $real = abs_path($file);

  if (!$real || index($real, $root) != 0 || !-f $real) {
    reply($c, 404, 'text/plain; charset=utf-8', "Not found\n", $method eq 'HEAD');
    exit 0;
  }
  my ($ext) = $real =~ /\.(\w+)$/;
  open(my $fh, '<:raw', $real) or do { reply($c, 404, 'text/plain', "Not found\n"); exit 0; };
  local $/;
  my $body = <$fh>;
  close $fh;
  reply($c, 200, $mime{lc($ext // '')} // 'application/octet-stream', $body, $method eq 'HEAD');
  exit 0;
}
