package benchmark

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class CoordinatedOmission extends Simulation {
    val httpConf = http
        .baseURL("http://172.31.10.4:3001")
        .headers(Map(
            "Accept-Encoding" -> "gzip"
        ))
        .maxConnectionsPerHost(51200)
        .shareConnections

    val scn = scenario("Test")
        .exec(http("benchmark")
            .get("/api/json/coordinatedOmission"))

    setUp(
        scn.inject(
            constantUsersPerSec(1000).during(250 seconds)
        ).protocols(httpConf)
    )
}
