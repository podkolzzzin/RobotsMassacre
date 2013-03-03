<?php
	function connect()
	{
		$db=mysql_connect("localhost","lugbskt","3MpFwEXy]w%u");
		mysql_select_db("lugbskt_notes",$db);
		mysql_query("SET NAMES 'utf8'",$db);
		return $db;
	}
	
	$map = file_get_contents($_FILES['file']['tmp_name']);
	$hash = md5_file($_FILES['file']['tmp_name']);
	$map=mysql_escape_string($map);
	$name=$_GET['name'];
	$mode=intval($_GET['mode']);
	$sql="INSERT INTO `tMaps`(`cHash`, `cTime`, `cName`, `cData`, `cMode`) 
	VALUES ('$hash','".time()."','$name','$map', '$mode')";
	echo $sql;
	mysql_query($sql,connect());
?>