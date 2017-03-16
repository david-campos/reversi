<?php
const MYSQLI_HOST = 'localhost';
const MYSQLI_USER = 'root';
const MYSQLI_PASS = '';
const MYSQLI_DB = 'reversi_logs';

$link = new mysqli(MYSQLI_HOST, MYSQLI_USER, MYSQLI_PASS, MYSQLI_DB);

$link->begin_transaction();

$generation = -1;
if ($_POST['logtype'] !== 'newlog')
    $generation = $_POST['generation'];

switch ($_POST['logtype']) {
    case 'newlog':
        $link->query("TRUNCATE TABLE individuals");
        $link->query("TRUNCATE TABLE fitness");
        break;
    case 'born':
        $born = explode(";", $_POST['born']);
        $stmt = $link->prepare("INSERT INTO individuals(generation, identifier, parentA, parentAGeneration, parentB,
                                  parentBGeneration) VALUES (?,?,?,?,?,?)");
        if ($stmt === false)
            die("Error: " . $link->error);
        foreach ($born as $b) {
            $parts = explode(",", $b);
            $parentAGen = $parts[1] < 0 ? null : $parts[1];
            $parentA = $parts[2] < 0 ? null : $parts[2];
            $parentBGen = $parts[3] < 0 ? null : $parts[3];
            $parentB = $parts[4] < 0 ? null : $parts[4];
            $stmt->bind_param('iiiiii', $generation, $parts[0], $parentA, $parentAGen, $parentB, $parentBGen);
            if (!$stmt->execute())
                echo "\nError inserting born\n" . $link->error;
        }
        $stmt->close();
        break;
    case 'killed':
        $killed = explode(";", $_POST['killed']);
        $stmt = $link->prepare("INSERT INTO individuals(generation, identifier, killedInGeneration) VALUES (?,?,?)
                                  ON DUPLICATE KEY UPDATE killedInGeneration=VALUES(killedInGeneration)");
        if ($stmt === false)
            die("Error: " . $link->error);
        foreach ($killed as $b) {
            $parts = explode(",", $b);
            $stmt->bind_param('iii', $parts[0], $parts[1], $generation);
            if (!$stmt->execute())
                echo "\nError inserting/updating individual\n" . $link->error;
        }
        $stmt->close();
        break;
    case 'fitness':
        $individuals = explode(";", $_POST['fitness']);
        $stmt = $link->prepare("INSERT INTO fitness(individualgeneration, individualidentifier, generation, reachedFitness)
                                  VALUES (?,?,?,?)");
        if ($stmt === false)
            die("Error: " . $link->error);
        foreach ($individuals as $b) {
            $parts = explode(",", $b);
            $stmt->bind_param('iiid', $parts[0], $parts[1], $generation, $parts[2]);
            if (!$stmt->execute())
                echo "\nError inserting fitness" . $link->error;
        }
        $stmt->close();
        break;
    default:
        http_response_code(400);
        echo 'No type';
        break;
}
$link->commit();
$link->close();
echo "Received, thanks!";